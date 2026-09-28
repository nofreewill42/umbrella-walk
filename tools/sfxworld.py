"""Physical models for everything that isn't an animal voice: water and weather, footsteps,
struck and scraped objects, cloth and paper, vehicles, and a few human sounds.

Each generator returns a mono numpy array at 44.1 kHz peaking at 1.0 (car_pass returns stereo).
The default parameters were tuned so that an AudioSet sound classifier hears each sound as what
it is meant to be (see the README, Sound). Everything is noise, impulses and resonances: no
samples, so the results are free to use."""
import numpy as np
from scipy.signal import lfilter, fftconvolve
from sfxdsp import SR, smooth_noise, lp, hp, bp, norm, curve, glottal, resonator_tv, tract, modal, bubble

BEAM = np.array([1, 2.756, 5.404, 8.933, 13.345, 18.638])          # free-free bar/tube bending modes
DISC = np.array([1, 1.59, 2.14, 2.30, 2.65, 2.92, 3.16, 3.50])        # thin disc (a coin)
BELL = np.array([1, 2.32, 4.25, 6.63, 9.38])                           # thin glass wall


# ---------------- helpers ----------------
def _n(d):
    return max(1, int(d * SR))


def _x(n):
    return np.arange(n) / SR


def _add(y, s, t):
    i = int(round(t * SR))
    if i >= len(y) or i + len(s) <= 0:
        return
    if i < 0:
        s, i = s[-i:], 0
    m = min(len(s), len(y) - i)
    y[i:i + m] += s[:m]


def reson(x, f, bw, gain=1.0):
    """constant two-pole resonator (unity gain at the centre)"""
    T = 1 / SR
    C = -np.exp(-2 * np.pi * bw * T)
    B = 2 * np.exp(-np.pi * bw * T) * np.cos(2 * np.pi * min(f, SR / 2 - 300) * T)
    return lfilter([(1 - B - C) * gain], [1, -B, -C], x)


def ring(f, tau, d, rng, phase=None):
    x = _x(_n(d))
    return np.sin(2 * np.pi * f * x + (rng.random() * 6.283 if phase is None else phase)) * np.exp(-x / tau)


def burst(d, tau, rng, lo=None, hi=None):
    n = _n(d)
    y = rng.standard_normal(n) * np.exp(-_x(n) / tau)
    if lo and hi:
        return bp(y, lo, hi)
    if hi:
        return lp(y, hi)
    if lo:
        return hp(y, lo)
    return y


def bump(n, peak=.5, sharp=2.0):
    """0..1..0 envelope with its maximum at `peak` (fraction of n)"""
    u = np.linspace(0, 1, n)
    a = np.where(u < peak, u / max(peak, 1e-3), (1 - u) / max(1 - peak, 1e-3))
    return np.sin(.5 * np.pi * np.clip(a, 0, 1)) ** sharp


def sparse_clicks(n, rate, rng, tau=.0006, pareto=1.6):
    """a dense rain of tiny clicks: Poisson times, heavy-tailed sizes"""
    k = rng.poisson(rate * n / SR)
    imp = np.zeros(n)
    idx = rng.integers(0, n, k)
    np.add.at(imp, idx, (rng.pareto(pareto, k) + 1) * rng.choice([-1, 1], k))
    ker = np.exp(-_x(_n(tau * 8)) / tau)
    return fftconvolve(imp, ker)[:n]


# ---------------- water and weather ----------------
def rain(d=4.0, dense=1.706, dense_rate=28130, pareto=4.84, grain_tau=.0003995, hiss=.4368, wash_lo=1272, wash_hi=15900, near=1.5,
         near_rate=23.51, tick_hi=3000, tick_tau=.001877, puddle=1, r_lo=.4, r_hi=1.796, body=.6582, seed=None):
    """steady rain on a street: a grainy wash of countless tiny impacts, closer drops ticking
    on hard ground, some of them plinking into puddles (a drop's bubble rings as it closes)"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    c = sparse_clicks(n, dense_rate, rng, grain_tau, pareto)
    y = bp(c / (np.std(c) + 1e-9), wash_lo, wash_hi) * dense * .3
    y += bp(rng.standard_normal(n), wash_lo, wash_hi) * hiss * .3
    y += lp(rng.standard_normal(n), 400) * body * .08                     # the low roar of it all
    for _ in range(rng.poisson(near_rate * d)):
        t0 = rng.random() * d
        a = rng.uniform(.2, 1) ** 2 * near
        s = burst(.02, tick_tau * rng.uniform(.6, 1.6), rng, 800, tick_hi) * a
        if rng.random() < puddle:
            b = bubble(np.exp(rng.uniform(np.log(r_lo), np.log(r_hi))), amp=a * .7, xi=.15)
            _add(y, b, t0 + .002)
        _add(y, s, t0)
    return norm(y)


def canopy(d=3.0, rate=32.39, f_lo=326.7, f_hi=1899, tau=.003441, click=.3785, click_hi=5667, wash=1.87, seed=None):
    """rain drumming on a taut umbrella: each drop knocks a panel of fabric, which rings briefly"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    y = bp(sparse_clicks(n, rate * 30, rng), 1500, 9000) * wash * .1
    for _ in range(rng.poisson(rate * d)):
        a = rng.uniform(.15, 1) ** 1.5
        f = np.exp(rng.uniform(np.log(min(f_lo, f_hi)), np.log(max(f_lo, f_hi))))
        s = ring(f, tau * rng.uniform(.7, 1.3), tau * 6, rng, 0)
        s2 = ring(f * rng.uniform(1.5, 1.8), tau * .6, tau * 6, rng, 0)
        c = burst(.004, .0007, rng, 1500, click_hi) * click
        k = s + .5 * s2
        k[:len(c)] += c
        _add(y, k * a, rng.random() * d)
    return norm(y)


def drip(r_mm=3.972, tick=1.431, tick_hi=10930, xi=.3495, tail=.2557, seed=None):
    """a drop falling into liquid: the impact tick, then the trapped bubble's rising 'plink'"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(tail + .02))
    _add(y, burst(.006, .0009, rng, 1000, tick_hi) * tick, 0)
    _add(y, bubble(r_mm, amp=1, xi=xi), .003)
    return norm(y)


def lid_tap(f1=1134, tau=.002, wet=.07579, seed=None):
    """a raindrop on a plastic lid: a tiny tick, the lid's few damped modes, a wet smack"""
    rng = np.random.default_rng(seed)
    y = modal(f1 * np.array([1, 1.63, 2.4, 3.1]), [tau, tau * .7, tau * .5, tau * .4], [1, .6, .4, .25], .05, rng, contact=.0003)
    y[:_n(.004)] += burst(.004, .0006, rng, 2000, 9000)
    y += burst(.05, .012, rng, 300, 2500)[:len(y)] * wet
    return norm(y)


def splash(d=1.4, impact=.8561, imp_hi=3618, imp_tau=.04202, whump=1.353, n_bub=164, r_lo=.6275, r_hi=4.217, bub_spread=.6342,
           spray=.829, spray_n=263, spray_d=.7046, spray_hi=7947, hiss=1.131, seed=None):
    """a sheet of water hitting something: the slap of the mass, a burst of bubbles as it
    churns, then the spray falling back as a shower of small drops"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    y = np.zeros(n)
    _add(y, burst(.4, imp_tau, rng, 120, imp_hi) * impact * 2.5, 0)
    _add(y, lp(burst(.3, .06, rng), 180) * whump * 6, 0)
    _add(y, burst(.6, .15, rng, 2000, 12000) * hiss, .01)
    for _ in range(n_bub):
        u = rng.random() ** 1.8
        r = np.exp(rng.uniform(np.log(r_lo), np.log(r_hi)))
        _add(y, bubble(r, amp=rng.uniform(.2, 1) * (1 - u) * .8, xi=.1), .005 + u * bub_spread)
    for _ in range(spray_n):
        u = rng.beta(1.6, 2.4)
        a = rng.uniform(.1, 1) ** 2 * spray * (1 - .6 * u)
        s = burst(.01, .0012, rng, 700, spray_hi) * a
        _add(y, s, .12 + u * spray_d)
        if rng.random() < .3:
            _add(y, bubble(np.exp(rng.uniform(np.log(.6), np.log(2.5))), amp=a * .5, xi=.15), .12 + u * spray_d)
    x = _x(n)
    return norm(y * np.clip((d - x) / .15, 0, 1))


def splat(d=.2976, size=.3, f_hi=419.8, f_lo=275.2, sweep=.0204, bw=728.8, crack=.5077, n_bub=5, r_hi=7.095, seed=None):
    """a small wet mass hitting something: a squelch (a quick falling resonance), a crack of
    contact and a few bubbles"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    src = rng.standard_normal(n) * np.exp(-_x(n) / (.03 * size))
    F = curve(n, [(0, f_hi), (min(.9, sweep / d), f_lo), (1, f_lo * .9)])
    y = resonator_tv(src, F, bw) * 3 + lp(src, 900) * .6
    _add(y, burst(.005, .0008, rng, 1500, 9000) * crack, 0)
    for _ in range(n_bub):
        _add(y, bubble(np.exp(rng.uniform(np.log(.8), np.log(r_hi))), amp=rng.uniform(.1, .5), xi=.1), rng.random() ** 2 * .08)
    return norm(y)


def plop(f=230.7, tau=.01, soft=250.5, grit=0, seed=None):
    """something soft landing on something soft (a dropping into soil, a sausage into a palm)"""
    rng = np.random.default_rng(seed)
    y = ring(f, tau, tau * 5, rng, 0) + lp(burst(tau * 5, tau * .5, rng), soft) * 1.5
    y += burst(tau * 5, .01, rng, 1500, 6000) * grit
    return norm(y)


def thunder(d=6.0, dist=.5, spread=2.237, n_seg=815, crack=0, hi=483.6, lo=44.6, seed=None):
    """distant thunder: the lightning channel is a crooked line kilometres long; every kink
    sends an N-wave, and they arrive over seconds as the distances differ. The air takes the
    highs away, which leaves the rumble."""
    rng = np.random.default_rng(seed)
    n = _n(d)
    imp = np.zeros(n)
    r = dist * 1000 + rng.random(n_seg) ** 1.4 * spread * 1000
    tarr = (r - dist * 1000) / 343 + .05
    for ti, ri in zip(tarr, r):
        if ti >= d - .05:
            continue
        L = int(rng.uniform(.004, .03) * SR)                       # N-wave length ~ kink size
        nw = np.linspace(1, -1, L) * (1000 / ri) * rng.uniform(.3, 1.5)
        _add(imp, nw, ti)
    y = lp(lp(imp, hi), hi) + crack * hp(imp, 800)
    y = hp(y, lo)
    y += lp(np.random.default_rng(seed).standard_normal(n), 80) * np.abs(lp(imp, 3)) * 20
    x = _x(n)
    return norm(y * np.clip((d - x) / 1.2, 0, 1))


def wind(d=3.0, gust=.1001, lo=357.4, hi=302.3, howl=.004524, howl_f=983.9, howl_bw=42.94, rumble=0, rate=2.037, seed=None):
    """wind in a street: turbulence (noise) whose loudness and pitch follow the wind speed, and
    a faint whistle round an edge, its pitch rising with speed (vortex shedding)"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    spd = np.clip(1 + gust * smooth_noise(n, rate, rng) * .6, .15, None)
    spd *= bump(n, .45, .8) * .8 + .2
    w = rng.standard_normal(n)
    y = resonator_tv(w, lo + (hi - lo) * spd / spd.max(), 200 + 500 * spd / spd.max()) * spd ** 2
    y += lp(w, 160) * rumble * spd ** 2 * 2
    y += resonator_tv(np.random.default_rng((seed or 0) + 1).standard_normal(n), howl_f * (.7 + .5 * spd / spd.max()), howl_bw) * howl * spd ** 3 * 2
    return norm(y)


def traffic(d=6.0, rumble=.7, cars=.35, car_lo=150, car_hi=1600, hiss=.25, seed=None):
    """the city a few streets away: a low roar and the occasional car swelling past"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    y = lp(lp(rng.standard_normal(n), 250), 250) * rumble * 3
    y *= 1 + .3 * smooth_noise(n, .3, rng)
    for _ in range(rng.poisson(cars * d) + 1):
        L = _n(rng.uniform(2.5, 5))
        s = bp(rng.standard_normal(L), car_lo, car_hi) * bump(L, rng.uniform(.4, .6), 2) * rng.uniform(.3, 1)
        _add(y, s, rng.uniform(-1.5, d))
    y += bp(rng.standard_normal(n), 2000, 7000) * hiss * .15
    return norm(y)


# ---------------- people ----------------
def footstep(heel=1.0, heel_lo=900, heel_hi=6500, heel_tau=.003, thud=.8, thud_hi=450, thud_tau=.02, knock=.25,
             knock_f=800, knock_bw=900, sole=.5, sole_delay=.065, sole_lo=150, sole_hi=2500, sole_tau=.012, scuff=.3,
             scuff_d=.1, grit=.4, grit_rate=3000, wet=0.0, seed=None):
    """a hard-soled shoe on paving. The heel strikes: a crisp click, a dull thud through the
    ground, the heel block's short knock. A moment later the sole slaps down and scuffs as it
    rolls, and grit crunches underneath. No two steps are the same. wet > 0 adds the squelch
    and spray of a wet pavement."""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(.35))
    v = rng.uniform(.7, 1.15)
    _add(y, bp(burst(.04, heel_tau * rng.uniform(.7, 1.4), rng), heel_lo * rng.uniform(.8, 1.25), heel_hi) * heel * v, 0)
    _add(y, lp(burst(.15, thud_tau, rng), thud_hi) * thud * 3 * v, 0)
    _add(y, reson(burst(.06, .002, rng), knock_f * rng.uniform(.85, 1.15), knock_bw) * knock * 3 * v, 0)
    sd = sole_delay * rng.uniform(.7, 1.3)
    _add(y, bp(burst(.08, sole_tau, rng), sole_lo, sole_hi) * sole * rng.uniform(.5, 1.2), sd)
    m = _n(scuff_d)
    _add(y, bp(rng.standard_normal(m), 2000, 8000) * bump(m, .3) * scuff * rng.uniform(.2, 1), sd)
    g = _n(.06)
    _add(y, bp(sparse_clicks(g, grit_rate, rng, .0002, 1.8), 1500, 9000) * np.exp(-_x(g) / .02) * grit, 0)
    if wet:                                           # a squelch, not a crack: soft onset, mid band, bubbles
        m = _n(.1)
        _add(y, bp(rng.standard_normal(m), 500, 4500) * np.minimum(1, _x(m) / .008) * np.exp(-_x(m) / .035) * wet * .5, sd * .5)
        for _ in range(int(8 + 14 * wet)):
            _add(y, bubble(np.exp(rng.uniform(np.log(1.0), np.log(4.5))), amp=rng.uniform(.05, .25) * wet, xi=.12), .005 + rng.random() * .07)
    return norm(y)


def walk(n=8, interval=.53, **kw):
    """a few steps, for listening and tuning"""
    seed = kw.pop('seed', None)
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(interval * n * 1.1 + .4))
    t = .02
    for k in range(n):
        _add(y, footstep(seed=None if seed is None else seed + k, **kw), t)
        t += interval * rng.uniform(.9, 1.1)
    return norm(y)


def clap(f=1393, bw=593.8, tau=.001078, click=.1901, body=0, seed=None):
    """one hand clap: the air squeezed out between the palms rings the cavity they form"""
    rng = np.random.default_rng(seed)
    src = burst(.05, tau, rng)
    y = reson(src, f * rng.uniform(.9, 1.1), bw) * 3 + hp(src, 3000) * click + lp(src, 500) * body
    return norm(y)


def claps(n=5, interval=.262, **kw):
    seed = kw.pop('seed', None)
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(interval * n + .1))
    for k in range(n):
        _add(y, clap(seed=None if seed is None else seed + k, **kw) * rng.uniform(.7, 1), k * interval + rng.normal(0, .006))
    return norm(y)


def slurp(d=.4269, suck=1.282, bubbles_n=63, r_lo=.7501, r_hi=3.824, hiss_lo=2192, hiss_hi=4681, gulp=.01278, gulp_f=147.1, seed=None):
    """a sip of hot coffee through a lid: air drawn in over the liquid (a hiss that rises as
    the mouth fills), the coffee bubbling in, and a small swallow after"""
    rng = np.random.default_rng(seed)
    n = _n(d + .2)
    y = np.zeros(n)
    m = _n(d)
    F = curve(m, [(0, hiss_lo * 1.4), (1, hiss_hi * .7)])
    h = resonator_tv(rng.standard_normal(m), F, F * .6) * bump(m, .35, 1.2) * suck * 2
    _add(y, burst(.02, .004, rng, 3000, 9000) * .4, 0)                  # lips part: 'tp'
    _add(y, h, .01)
    for _ in range(bubbles_n):
        u = rng.beta(2, 2)
        _add(y, bubble(np.exp(rng.uniform(np.log(r_lo), np.log(r_hi))), amp=rng.uniform(.15, .6), xi=.2), .03 + u * d * .8)
    g = ring(gulp_f, .03, .12, rng, 0) + lp(burst(.12, .02, rng), 700)
    _add(y, g * gulp, d + .05)
    return norm(y)


def sniffs(n=3, interval=.12, d=.075, F1=1700, F2=3300, B=500, air=.2, seed=None):
    """quick sniffs: air pulled in through the nose, each a short noise swell shaped by the nasal passages"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(interval * n * 1.4 + d * 1.3 + .05))
    t = 0.0
    for k in range(n):
        m = _n(d * rng.uniform(.7, 1.3))
        e = np.sin(np.pi * np.linspace(0, 1, m) ** .6) ** 2
        f1, f2 = F1 * rng.uniform(.85, 1.15), F2 * rng.uniform(.85, 1.15)
        s = (reson(rng.standard_normal(m), f1, B) + .7 * reson(rng.standard_normal(m), f2, B * 1.4) + air * hp(rng.standard_normal(m), 4000)) * e
        _add(y, s * rng.uniform(.5, 1), t)
        t += interval * rng.uniform(.7, 1.35)
    return norm(y)


def lap(tick=.5, r_mm=1.3, suck=.4, seed=None):
    """one lick: the tongue touches, a small wet click, a little suction"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(.09))
    _add(y, burst(.01, .0012, rng, 1200, 6000) * tick, 0)
    _add(y, bubble(r_mm * rng.uniform(.8, 1.3), amp=.6, xi=.25), .006)
    _add(y, bp(rng.standard_normal(_n(.04)), 700, 3000) * bump(_n(.04), .3) * suck, .01)
    return norm(y)


def voice_yay(f0=315.7, peak=.2038, d=.9331, rise=.9806, fall=.5375, breath=.892, jitter=.01327, vowel='yay', seed=None):
    """a child's 'yaaay!': a glottal voice gliding j-e-i with a rise and fall of pitch"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    f = curve(n, [(0, f0), (peak, f0 * rise), (1, f0 * fall)])
    src = glottal(f, rng, jitter, .1, oq=.55, breath=breath)
    if vowel == 'oh':                             # a surprised 'ooh!'
        F1 = curve(n, [(0, 420), (.15, 640), (1, 560)])
        F2 = curve(n, [(0, 1100), (.15, 1200), (1, 950)])
        F3 = curve(n, [(0, 3300), (1, 3200)])
    else:                                          # 'yay': j - e - i
        F1 = curve(n, [(0, 380), (.12, 950), (.7, 900), (1, 520)])
        F2 = curve(n, [(0, 3000), (.12, 2200), (.7, 2350), (1, 2900)])
        F3 = curve(n, [(0, 3900), (.5, 3500), (1, 3800)])
    y = tract(src, [(F1, 110), (F2, 150), (F3, 250), (4700, 400)])
    x = _x(n)
    e = np.minimum(1, x / .04) * np.clip((d - x) / .18, 0, 1) ** 1.3
    return norm(y * e)


def kids_cheer(kids=2, spread=.2522, **kw):
    seed = kw.pop('seed', None)
    rng = np.random.default_rng(seed)
    d = kw.get('d', voice_yay.__defaults__[2])
    y = np.zeros(_n(d + spread * kids + .1))
    f0 = kw.pop('f0', 420)
    for k in range(kids):
        _add(y, voice_yay(f0=f0 * rng.uniform(.85, 1.2), seed=None if seed is None else seed + k, **kw) * rng.uniform(.6, 1), k * spread * rng.uniform(.5, 1.2))
    return norm(y)


# ---------------- things struck, scraped, snapped ----------------
def clang(f1=423.5, n_modes=5, tau=.3129, tau_pow=.1833, hard=2257, contact=.000429, shell=1.201, shell_lo=1265, seed=None):
    """steel tube struck: bending modes of a free bar (inharmonic, the highs die first), plus
    the tube wall's own dense ring"""
    rng = np.random.default_rng(seed)
    fr = f1 * BEAM[:n_modes]
    y = modal(fr, tau / BEAM[:n_modes] ** tau_pow, 1 / np.sqrt(np.arange(1, n_modes + 1)), tau * 1.5, rng, contact=contact, hardness=hard)
    k = 12
    y += modal(shell_lo * np.exp(rng.uniform(0, 1.2, k)), rng.uniform(.03, .12, k), rng.uniform(.2, 1, k), tau * 1.5, rng, contact=contact, hardness=hard) * shell
    return norm(y)


def rail_slide(d=.8, f1=1083, rate=2280, grit=1.491, q=17.19, seed=None):
    """a hook sliding along a steel rail: stick-slip friction keeps knocking the rail's modes"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    exc = sparse_clicks(n, rate, rng, tau=.0003, pareto=2.2) + grit * .3 * lp(rng.standard_normal(n), 3000)
    y = sum(reson(exc, f1 * b, f1 * b / q) / np.sqrt(i + 1) for i, b in enumerate(BEAM[:5]))
    y += bp(exc, 2000, 8000) * .5
    return norm(y * bump(n, .15, .5))


def glass_clink(f1=2100, tau=.7, hard=12000, coin=.5, coin_f=5200, seed=None):
    """a coin hitting a glass jar: the jar rings in its bell-like modes, the coin rings bright"""
    rng = np.random.default_rng(seed)
    y = modal(f1 * BELL, tau / BELL ** .6, [1, .6, .4, .25, .15], tau * 1.4, rng, contact=.0003, hardness=hard)
    y += modal(coin_f * DISC, [.25, .2, .15, .12, .1, .08, .07, .06], np.ones(8) * .5, tau * 1.4, rng, contact=.0003) * coin
    return norm(y)


def coin_in_jar(bounces=1, restitution=.6837, first=.1724, f1=1736, tau=.07879, coin_f=2897, seed=None):
    """the coin drops in: hits the glass, then bounces on the bottom, each bounce sooner and softer"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(first * 3 + tau * 1.4))
    t, a, gap = 0.0, 1.0, first
    for k in range(bounces + 1):
        _add(y, glass_clink(f1 * (1 if k == 0 else .8), tau, coin=.8, coin_f=coin_f, seed=None if seed is None else seed + k) * a, t)
        t += gap
        gap *= restitution
        a *= .55
    return norm(y)


def coin_flick(f1=2630, tau=.09245, spin=42.34, spin_depth=.3901, seed=None):
    """a thumb-flicked coin: a bright ring that wobbles as it spins"""
    rng = np.random.default_rng(seed)
    y = modal(f1 * DISC, tau / DISC ** .7, [1, .8, .6, .6, .5, .4, .3, .25], tau * 1.3, rng, contact=.0002)
    x = _x(len(y))
    y *= 1 - spin_depth + spin_depth * np.abs(np.sin(np.pi * spin * x))
    _add(y, burst(.005, .0005, rng, 2000, 9000) * .5, 0)
    return norm(y)


def ceramic(f1=2127, tau=.0188, hard=2000, n_modes=5, seed=None):
    """terracotta knocked: a dull, heavily damped ring"""
    rng = np.random.default_rng(seed)
    r = np.array([1, 1.72, 2.51, 3.43, 4.62, 5.9])[:n_modes]
    return norm(modal(f1 * r, tau / r ** .4, 1 / r ** .5, tau * 6, rng, contact=.0005, hardness=hard))


def knock(f1=420, tau=.02, hard=5000, seed=None):
    """wood or stiff felt knocked"""
    rng = np.random.default_rng(seed)
    r = np.array([1, 2.1, 3.3, 4.9])
    return norm(modal(f1 * r, tau / r ** .5, [1, .5, .3, .2], tau * 6, rng, contact=.0008, hardness=hard))


def letterbox(f1=302.2, tau=.1729, rattle=0, gap=.02244, seed=None):
    """a sprung brass letterbox flap banging: a clank and a quick rattle as it settles"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(tau * 4 + rattle * gap))
    a = 1.0
    for k in range(rattle + 1):
        _add(y, clang(f1, 5, tau, .5, contact=.0004, shell=.6, shell_lo=2200, seed=None if seed is None else seed + k) * a, k * gap * (1 + .3 * rng.random()))
        a *= .45
    return norm(y)


def scrape(d=.35, rate=420, jitter=.6, r1=950, r2=1750, r3=2700, q=7, grit=.5, lo=400, hi=4500, seed=None):
    """one hard thing dragged over another: stick-slip. The surfaces catch and release many
    times a second, and each release knocks the object's resonances."""
    rng = np.random.default_rng(seed)
    n = _n(d)
    r = rate * (1 + jitter * smooth_noise(n, 25, rng) * .5)
    ph = np.cumsum(np.clip(r, 20, None) / SR)
    idx = np.nonzero(np.diff(np.floor(ph), prepend=0) > 0)[0]
    imp = np.zeros(n)
    imp[idx] = rng.pareto(2, len(idx)) + .3
    y = sum(reson(imp, f, f / q) for f in (r1, r2, r3)) + bp(rng.standard_normal(n), lo, hi) * grit * .3
    return norm(y * bump(n, .12, .6))


def chop(board=1.236, board_f=444.2, board_tau=.009725, blade=.1943, blade_f=2799, crack=.4235, wet=1.454, seed=None):
    """a cleaver through a sausage into the block: a crack, the block's thud, a little blade ring, a squelch"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(.35))
    _add(y, burst(.01, .0012, rng, 1500, 9000) * crack, 0)
    _add(y, (ring(board_f, board_tau, .25, rng, 0) + .5 * ring(board_f * 2.3, board_tau * .6, .25, rng, 0)) * board, .001)
    _add(y, lp(burst(.1, .012, rng), 1200) * board * .8, 0)
    _add(y, modal(blade_f * BEAM[:3], [.15, .08, .05], [1, .5, .3], .3, rng, contact=.0003) * blade, 0)
    _add(y, splat(.2, .6, seed=None if seed is None else seed + 1) * wet, .004)
    return norm(y)


def squish(d=.1509, f_hi=300, f_lo=502, bw=50, suck=1.5, seed=None):
    """a skewer going into a sausage: a slow wet squelch"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    src = rng.standard_normal(n) * bump(n, .25, 1)
    F = curve(n, [(0, f_hi), (.6, f_lo), (1, f_lo)])
    y = resonator_tv(src, F, bw) * 3 + lp(src, 600) * .4
    for _ in range(8):
        _add(y, bubble(np.exp(rng.uniform(np.log(1.5), np.log(5))), amp=rng.uniform(.1, .4) * suck, xi=.2), rng.random() * d * .8)
    return norm(y)


def paper(d=.3443, snap=.7548, rate=84.35, lo=2531, hi=5044, flutter=.03398, seed=None):
    """a letter flicked: the sheet snaps, then crackles as it flexes in the air"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    y = bp(sparse_clicks(n, rate, rng, tau=.0002, pareto=1.3), lo, hi) * bump(n, .15, .7)
    _add(y, burst(.006, .0007, rng, 1200, 11000) * snap * 4, 0)
    y += bp(rng.standard_normal(n), 400, 2500) * bump(n, .3, 1) * flutter * .3
    return norm(y)


def rustle(d=.6, rate=900, lo=1500, hi=9000, body=.3, seed=None):
    """paper or cloth moved about: bursts of crackle"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    g = np.clip(smooth_noise(n, 12, rng), 0, None) ** 1.5
    y = bp(sparse_clicks(n, rate, rng, tau=.0003, pareto=1.4), lo, hi) * g
    y += bp(rng.standard_normal(n), 300, 1800) * g * body * .2
    return norm(y * bump(n, .3, .5))


def whoosh(d=.4, peak=.4677, f_lo=800, f_hi=500, q=5, sharp=4, air=.4036, seed=None):
    """something swung fast through the air: turbulence whose pitch and loudness follow its speed"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    s = bump(n, peak, 1.0)
    F = f_lo + (f_hi - f_lo) * s
    y = resonator_tv(rng.standard_normal(n), F, F / q) * s ** sharp
    y += hp(rng.standard_normal(n), 3500) * s ** (sharp * 2) * air * .3
    return norm(y)


def umbrella_open(d=.55, click=1.062, runner=.1072, runner_d=.1636, runner_f=800, pop=.9138, pop_t=.1554, pop_hi=957.6,
                  pop_tau=.08, thump=1.266, crackle=0, ribs=.1918, rib_f=3142, air=1.5, seed=None):
    """an umbrella opening: the catch clicks, the runner rasps up the shaft, the canopy sweeps
    air and then snaps taut with a whump as the ribs lock (they tick against each other)"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(d))
    _add(y, modal([2900, 4700, 6800], [.006, .004, .003], [1, .6, .4], .04, rng, contact=.0002) * click, 0)
    m = _n(runner_d)
    F = curve(m, [(0, runner_f * .7), (1, runner_f * 1.3)])
    _add(y, resonator_tv(sparse_clicks(m, 1500, rng, .0002, 2) + .2 * rng.standard_normal(m), F, 300) * bump(m, .5, .5) * runner, .008)
    _add(y, whoosh(pop_t + .02, .85, 200, 900, 1.2, 1.5, 0, seed=None if seed is None else seed + 1) * air, 0)
    _add(y, lp(burst(.25, pop_tau, rng), pop_hi) * pop * 2, pop_t)
    _add(y, ring(95, .05, .25, rng, 0) * thump, pop_t)
    _add(y, burst(.06, .01, rng, 2500, 10000) * crackle, pop_t)
    for k in range(6):
        _add(y, modal([rib_f * rng.uniform(.85, 1.2)], [.012], [1], .05, rng, contact=.0002) * ribs * rng.uniform(.4, 1), pop_t + .002 + k * .004 * rng.random())
    return norm(y)


def umbrella_close(d=.5, rustle_d=.28, runner=.5, click=.6, seed=None):
    """an umbrella closing: the canopy collapses with a fabric rustle, the runner slides down, a click"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(d))
    _add(y, rustle(rustle_d, 1400, 1200, 8000, .5, seed=seed) * .8, 0)
    m = _n(.12)
    F = curve(m, [(0, 2800), (1, 1800)])
    _add(y, resonator_tv(sparse_clicks(m, 1200, rng, .0002, 2), F, 300) * bump(m, .5, .5) * runner, rustle_d * .6)
    _add(y, modal([2600, 4300, 6100], [.006, .004, .003], [1, .6, .4], .04, rng, contact=.0002) * click, rustle_d * .6 + .12)
    return norm(y)


# ---------------- vehicles and doors ----------------
def _firing(n, rate, rng, tau=.005, rough=.06, clatter=.3, clatter_hi=5000, imbalance=.2, noise=.6, body_lo=150,
            body_hi=1800, cyl=4):
    """an engine's combustion events at an instantaneous rate (Hz). Each firing is a pressure kick
    plus a burst of combustion noise; a diesel adds a hard knock. The cylinders are never quite
    equal, so the pattern repeats every engine cycle (the lope you hear at idle)."""
    ph = np.cumsum(rate * (1 + rough * .5 * smooth_noise(n, 40, rng)) / SR)
    idx = np.nonzero(np.diff(np.floor(ph), prepend=0) > 0)[0]
    g = 1 + imbalance * rng.standard_normal(cyl)
    a = np.clip(g[np.arange(len(idx)) % cyl] * (1 + rough * 2 * rng.standard_normal(len(idx))), .1, None)
    imp = np.zeros(n)
    imp[idx] = a
    k = _n(tau * 6)
    kick = np.exp(-_x(k) / tau) * np.sin(np.pi * np.minimum(1, _x(k) / .0015))
    y = fftconvolve(imp, kick)[:n]
    env = fftconvolve(imp, np.exp(-_x(_n(tau * 12)) / (tau * 2)))[:n]
    y += bp(rng.standard_normal(n), body_lo, body_hi) * env * noise
    if clatter:
        ik = np.zeros(n)
        ik[idx] = a * np.clip(1 + .4 * rng.standard_normal(len(idx)), .2, None)
        ek = fftconvolve(ik, np.exp(-_x(_n(.005)) / .0008))[:n]
        y += bp(rng.standard_normal(n), 1200, clatter_hi) * ek * clatter
    return y


def engine(d=1.5, rpm0=892.7, rpm1=None, cyl=4, ex1=30.41, ex_q=.8156, tau=.001514, rough=.08272, clatter=1.535,
           clatter_hi=4504, mech=.529, rumble=.9388, imbalance=.1788, noise=1.923, body_lo=600, body_hi=2946, rpm_curve=None, seed=None):
    """a diesel engine at a (gliding) rpm, heard at the back: firing pulses through the exhaust's resonances"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    rpm = curve(n, [(0, rpm0), (1, rpm1 or rpm0)]) if rpm_curve is None else np.interp(np.arange(n), np.linspace(0, n - 1, len(rpm_curve)), rpm_curve)
    rate = rpm / 60 * cyl / 2
    f = _firing(n, rate, rng, tau, rough, clatter, clatter_hi, imbalance, noise, body_lo, body_hi, cyl)
    y = sum(reson(f, ex1 * k, ex1 * k / ex_q) / k ** .5 for k in (1, 2, 3.1, 4.3)) * 2 + f * .3
    y += lp(rng.standard_normal(n), 120) * rumble * np.sqrt(rpm / 800)
    y += bp(rng.standard_normal(n), 800, 3000) * mech * .2
    return norm(y)


def engine_start(d=1.8, crank_d=.5272, crank_rpm=157.2, idle_rpm=800, flare_rpm=1000, starter=1.5, starter_f=432.6, whine=.07422,
                 chug=1.13, chug_f=58.01, gear=.3096, gear_lo=732.4, gear_hi=4565, run=1.5, seed=None, **eng):
    """the starter motor grinds and the engine turns over (the starter slows and the air chugs at
    each compression), then it catches, flares up and settles to idle (the engine() model)"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    m = _n(crank_d)
    x = _x(m)
    comp = (crank_rpm / 60) * 2                                    # compressions per second (4 cylinders)
    cph = 2 * np.pi * np.cumsum(comp * (1 + .1 * smooth_noise(m, 4, rng)) / SR)
    load = (.5 + .5 * np.cos(cph)) ** 3                            # the starter labours on each compression
    sf = starter_f * (1 - .15 * load)
    # the starter motor: a rough, noisy whine (narrow noise bands, not pure tones) and its gears grinding
    wh = sum(resonator_tv(rng.standard_normal(m), sf * r, 30 + 15 * r) / r for r in (1, 2.13, 3.3)) * whine * 3
    wh += bp(rng.standard_normal(m), gear_lo, gear_hi) * gear * (.4 + .6 * (1 - load)) * (1 + .5 * np.clip(smooth_noise(m, 60, rng), 0, None))
    y = np.zeros(n)
    _add(y, wh * starter * np.minimum(1, x / .03) * np.clip((crank_d - x) / .04, 0, 1), 0)
    ch = reson(rng.standard_normal(m) * load ** 2, chug_f, chug_f * .6) * 6 + lp(rng.standard_normal(m) * load ** 3, 500)
    _add(y, ch * chug, 0)
    r = d - crank_d
    kn = [(0, crank_rpm * 2), (.1 / r, flare_rpm), (.3 / r, flare_rpm * .95), (min(.95, .8 / r), idle_rpm), (1, idle_rpm)]
    rc = np.interp(np.linspace(0, 1, 200), [k[0] for k in kn], [k[1] for k in kn])
    e = engine(r, rpm_curve=rc, seed=None if seed is None else seed + 1, **eng)
    _add(y, e * run * np.minimum(1, _x(len(e)) / .02), crank_d - .01)
    return norm(y)


def door_slam(body_f=62, body_tau=.07, p1=170, p_ratio=1.7, panel_tau=.05, latch=.6, latch_f=2600, latch_tau=.015,
              air=.5, rattle=.25, second=.4, gap=.018, crunch=.6, crunch_hi=3000, seed=None):
    """a car door slammed: the air it pushes, the panel's heavy thud, the latch's metal clack"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(.5))
    _add(y, lp(burst(.1, .015, rng), 300) * air * 3, 0)
    _add(y, ring(body_f, body_tau, .4, rng, 0) * 2, .004)
    for i, f in enumerate(p1 * p_ratio ** np.arange(3)):
        _add(y, ring(f * rng.uniform(.95, 1.05), panel_tau / (1 + .4 * i), .3, rng) / (1 + i), .004)
    _add(y, modal(latch_f * np.array([1, 1.5, 2.3, 3.1]), [latch_tau, latch_tau * .7, latch_tau * .5, latch_tau * .4], [1, .7, .5, .3], .1, rng, contact=.0003) * latch, .003)
    _add(y, burst(.12, .02, rng, 1200, 5000) * rattle, .03)
    _add(y, lp(burst(.15, .025, rng), crunch_hi) * crunch * 2, .002)          # the panel's broadband crunch
    if second:
        z = y.copy()
        _add(y, z[:_n(.3)] * second, gap)                               # 'ka-CHUNK': latch catches, then the door seats
    return norm(y)


def sliding_door(d=.5835, roll=1.5, roll_rate=12.39, lo=40, hi=1479, slam=.2004, seed=None):
    """a van's sliding door run shut: the rollers rumble along the track, then it slams into the latch"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    x = _x(n)
    spd = np.minimum(1, x / (d * .4)) ** .7
    ph = np.cumsum(roll_rate * spd / SR)
    bumps = (.4 + .6 * np.abs(np.sin(np.pi * ph)) ** 8)
    y = np.zeros(n + _n(.5))
    _add(y, bp(rng.standard_normal(n), lo, hi) * bumps * spd * roll, 0)
    _add(y, door_slam(seed=seed) * slam * 1.6, d)
    return norm(y)


def car_pass(d=3.0, t_close=1.4, v=8.128, dist=4.693, rpm=2131, cyl=4, tire=.8334, tire_lo=533.5, tire_hi=1899, wet=.05776,
             engine_amt=1.133, seed=None):
    """a car driving past, rendered physically: engine and tyre noise at the car, delayed by the
    travel time to the listener (which makes the Doppler shift), 1/r loudness, the air
    taking the highs off at a distance, panned by the angle. Returns stereo."""
    rng = np.random.default_rng(seed)
    pre = .3
    n = _n(d + pre)
    src = bp(rng.standard_normal(n), tire_lo, tire_hi) * tire
    src = src + hp(rng.standard_normal(n), 2500) * wet * .8 * (1 + .5 * np.clip(smooth_noise(n, 30, rng), 0, None))
    f = _firing(n, np.full(n, rpm / 60 * cyl / 2), rng, .004, .05, .1)
    src += (reson(f, 110, 50) + reson(f, 230, 70)) * engine_amt * 3
    x = _x(_n(d))
    px = v * (x - t_close)
    r = np.sqrt(px ** 2 + dist ** 2)
    ts = x + pre - r / 343.0                                          # emission time of what arrives now
    s = np.interp(ts * SR, np.arange(n), src)
    g = 1 / r
    y = s * g
    # air absorption and the car body shading the tyres when it's side-on at a distance
    fc = 12000 / (1 + r / 12)
    lo_part = lp(y, 1500)
    hi_part = y - lo_part
    mix = np.clip(fc / 12000, 0, 1)
    y = lo_part + hi_part * mix
    pan = px / r
    L = y * np.sqrt((1 - pan) / 2) * 1.414
    R = y * np.sqrt((1 + pan) / 2) * 1.414
    out = np.vstack([L, R])
    return out / (np.max(np.abs(out)) + 1e-12)


def scooter(d=3.0, speed=3.0, seam=.6, wheelbase=.5, click=.8, click_f=1100, roll=.5, roll_hi=1400, bearing=.12,
            bearing_f=850, seed=None):
    """a kick scooter on paving slabs: hard little wheels rumble, and clack over each joint, front
    wheel then back"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    y = lp(rng.standard_normal(n), roll_hi) * roll * .5 * (1 + .2 * smooth_noise(n, 8, rng))
    y += reson(rng.standard_normal(n), bearing_f, 40) * bearing
    t = rng.random() * seam / speed
    while t < d:
        for off in (0, wheelbase / speed):
            k = reson(burst(.03, .0015, rng), click_f * rng.uniform(.9, 1.1), 250) * 4
            k[:_n(.01)] += burst(.01, .0006, rng, 2000, 8000)
            _add(y, k * click * rng.uniform(.7, 1), t + off)
        t += seam / speed * rng.uniform(.9, 1.1)
    return norm(y)


def birdsong(d=1.4, f_lo=2600, f_hi=5200, notes=6, trill=.4, seed=None):
    """a small songbird: a phrase of whistled notes, sweeping up, down, or trilled"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(d))
    t = rng.random() * .1
    for k in range(notes):
        L = rng.uniform(.05, .16)
        m = _n(L)
        a, b = np.exp(rng.uniform(np.log(f_lo), np.log(f_hi), 2))
        f = curve(m, [(0, a), (rng.uniform(.3, .7), (a + b) / 2 * rng.uniform(.9, 1.15)), (1, b)])
        if rng.random() < trill:
            f = f * (1 + .06 * np.sin(2 * np.pi * rng.uniform(25, 60) * _x(m)))
        ph = 2 * np.pi * np.cumsum(f) / SR
        s = (np.sin(ph) + .12 * np.sin(2 * ph)) * np.sin(np.pi * np.linspace(0, 1, m)) ** 1.5
        _add(y, s * rng.uniform(.5, 1), t)
        t += L + rng.uniform(.02, .12)
        if t > d - .1:
            break
    return norm(y + rng.standard_normal(len(y)) * 1e-4)


def bell(prime=165.0, d=7.0, tau=5.0, hum=.7, tierce=.8, nominal=1.0, upper=.5, warble=.4, clapper=.6, hard=4000, seed=None):
    """a great tower bell (tuned like an English hour bell): hum, prime, minor-third tierce,
    quint, nominal an octave up and a few upper partials. Each partial is really a close pair,
    so it beats (the bell's slow warble). The highs die first; the hum lingers."""
    rng = np.random.default_rng(seed)
    n = _n(d)
    x = _x(n)
    parts = [(.5, hum, 1.6), (1.0, .55, 1.0), (1.2, tierce, .75), (1.5, .3, .6), (2.0, nominal, .5), (2.5, upper * .6, .3),
             (2.67, upper * .5, .28), (3.0, upper * .45, .25), (4.0, upper * .3, .18), (5.33, upper * .2, .12)]
    y = np.zeros(n)
    for r, a, tf in parts:
        f = prime * r
        df = warble * rng.uniform(.3, 1.2) * (1 + r * .2)
        y += a * (np.sin(2 * np.pi * f * x + rng.random() * 6) + .7 * np.sin(2 * np.pi * (f + df) * x + rng.random() * 6)) * np.exp(-x / (tau * tf))
    k = burst(.02, .002, rng, 200, hard) * clapper * 4
    y[:len(k)] += k
    return norm(y)


def leaves(d=3.0, rate=20000, lo=3209, hi=14000, gust=1.105, gust_rate=3, body=.1401, seed=None):
    """wind through a tree: countless leaves ticking against each other, swelling with the gusts"""
    rng = np.random.default_rng(seed)
    n = _n(d)
    g = np.clip(.6 + gust * .5 * smooth_noise(n, gust_rate, rng), .05, None) ** 2
    y = bp(sparse_clicks(n, rate, rng, .0003, 2.2), lo, hi) * g
    y += bp(rng.standard_normal(n), 400, 3000) * g * body * .3
    return norm(y)


def paws(d=1.2, rate=7.0, claws=.7, claw_hi=7000, pads=.6, pad_f=160, seed=None):
    """a dog trotting on pavement: four feet in a rhythm, the claws ticking, the pads thudding softly"""
    rng = np.random.default_rng(seed)
    y = np.zeros(_n(d + .1))
    t = rng.random() * .05
    offs = [0, .12, .5, .62]
    while t < d:
        for o in offs:
            tt_ = t + o / rate * 2 * rng.uniform(.9, 1.1)
            if tt_ >= d:
                continue
            _add(y, burst(.006, .0004, rng, 2500, claw_hi) * claws * rng.uniform(.4, 1), tt_)
            _add(y, lp(burst(.04, .006, rng), pad_f * 4) * pads * rng.uniform(.5, 1), tt_ + .003)
        t += 2 / rate
    return norm(y)
