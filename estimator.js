/* ZeeFrames — Project Estimator
   All pricing lives in PRICING below: edit the numbers, nothing else needs to change. */
(function () {
    'use strict';

    var PRICING = {
        rate: 45,               // blended USD per hour
        spread: [0.9, 1.15],    // low / high end of the shown range
        roundTo: 500,
        hoursPerWeek: 32,       // productive hours per designer per week
        team: [120, 400, 900, 1600], // hour thresholds for the 2nd, 3rd, 4th, 5th designer
        priorityMarkup: 0.2,    // +20% for priority start

        hoursPerUnit: { simple: 5, standard: 8, complex: 13 },
        extraPlatform: 0.35,    // each extra platform re-uses ~65% of the work

        services: {
            saas:    { name: 'SaaS UI UX Design',   unit: 'screens', min: 5, max: 120, def: 30, mult: 1,    discovery: 20, platforms: ['web'] },
            mobile:  { name: 'Mobile App Design',   unit: 'screens', min: 5, max: 100, def: 25, mult: 1,    discovery: 20, platforms: ['ios', 'android'] },
            mvp:     { name: 'MVP Design',          unit: 'screens', min: 5, max: 40,  def: 15, mult: 0.85, discovery: 12, platforms: ['web'] },
            revamp:  { name: 'Product Revamp',      unit: 'screens', min: 5, max: 120, def: 35, mult: 1.1,  discovery: 36, platforms: ['web'] },
            website: { name: 'Website Design',      unit: 'pages',   min: 3, max: 40,  def: 8,  mult: 0.75, discovery: 12, platforms: null },
            nocode:  { name: 'No-Code Development', unit: 'screens', min: 5, max: 60,  def: 12, mult: 1.9,  discovery: 16, platforms: ['web'] }
        },

        // fixed hours + hours per screen/page
        addons: [
            { id: 'research',  name: 'UX Research & Interviews', desc: 'Stakeholder workshops, 5–8 user interviews, personas.', fixed: 40, perUnit: 0,   phase: 0, on: false },
            { id: 'system',    name: 'Design System',            desc: 'Tokens, components and usage guidelines in Figma.',     fixed: 28, perUnit: 0.8, phase: 1, on: true },
            { id: 'prototype', name: 'Interactive Prototype',    desc: 'Clickable flows ready for demos and investors.',       fixed: 8,  perUnit: 0.6, phase: 2, on: true },
            { id: 'testing',   name: 'Usability Testing',        desc: 'Moderated sessions with 5 real users and a report.',   fixed: 32, perUnit: 0,   phase: 2, on: false },
            { id: 'motion',    name: 'Motion & Micro-interactions', desc: 'Transitions and states handed off as Lottie.',      fixed: 12, perUnit: 0.5, phase: 2, on: false },
            { id: 'brand',     name: 'Brand Identity Kit',       desc: 'Logo refresh, color, type and brand guidelines.',      fixed: 44, perUnit: 0,   phase: 1, on: false }
        ],

        handoffShare: 0.08      // developer handoff, share of design hours (always included)
    };

    var root = document.getElementById('estimator');
    if (!root) return;

    var $ = function (sel) { return root.querySelector(sel); };
    var $$ = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };

    var form = $('#zfeForm');
    var range = $('#zfeScope');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── build add-on rows ── */
    var checkSvg = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 7.2 5.7 9.8 11 4.5" stroke="#0D0D0D" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    $('#zfeAddons').innerHTML = PRICING.addons.map(function (a) {
        return '<label class="zfe-addon">' +
            '<input class="zfe-sr" type="checkbox" name="addon" value="' + a.id + '"' + (a.on ? ' checked' : '') + ' />' +
            '<span class="zfe-check">' + checkSvg + '</span>' +
            '<span class="zfe-addon-text">' +
            '<span class="zfe-addon-top"><span class="zfe-addon-name">' + a.name + '</span><span class="zfe-addon-price" data-addon-price="' + a.id + '"></span></span>' +
            '<span class="zfe-addon-desc">' + a.desc + '</span>' +
            '</span></label>';
    }).join('');

    /* ── helpers ── */
    function money(n) {
        return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function short(n) {
        return n >= 1000 ? '$' + (Math.round(n / 100) / 10).toString().replace(/\.0$/, '') + 'k' : money(n);
    }

    function checked(name) {
        return $$('input[name="' + name + '"]:checked').map(function (i) { return i.value; });
    }

    function paintRange() {
        var p = (range.value - range.min) / (range.max - range.min) * 100;
        range.style.setProperty('--p', p + '%');
    }

    function paintTicks(s) {
        var steps = 4, out = [];
        for (var i = 0; i <= steps; i++) out.push('<span>' + Math.round(s.min + (s.max - s.min) * i / steps) + '</span>');
        $('#zfeTicks').innerHTML = out.join('');
    }

    /* count-up for the headline numbers */
    var shown = {};
    function tween(el, key, to, fmt) {
        var from = shown[key] == null ? to : shown[key];
        shown[key] = to;
        if (reduceMotion || from === to) { el.textContent = fmt(to); return; }
        var t0 = null, dur = 450;
        cancelAnimationFrame(el._raf);
        function frame(t) {
            if (!t0) t0 = t;
            var k = Math.min(1, (t - t0) / dur);
            k = 1 - Math.pow(1 - k, 3);
            el.textContent = fmt(from + (to - from) * k);
            if (k < 1) el._raf = requestAnimationFrame(frame);
        }
        el._raf = requestAnimationFrame(frame);
    }

    /* ── service switch: sensible defaults per service ── */
    var currentService = null;
    function applyService(id) {
        var s = PRICING.services[id];
        currentService = id;
        range.min = s.min;
        range.max = s.max;
        range.value = s.def;
        paintTicks(s);

        var unit = s.unit;
        $('#zfeScopeTitle').textContent = 'How many unique ' + unit + '?';
        $('#zfeScopeHint').textContent = unit === 'pages' ? 'Home, pricing, about, blog templates…' : 'Count distinct layouts, not states.';
        $$('.zfe-stepper button')[0].setAttribute('aria-label', 'Fewer ' + unit);
        $$('.zfe-stepper button')[1].setAttribute('aria-label', 'More ' + unit);

        var platformInputs = $$('input[name="platform"]');
        platformInputs.forEach(function (i) {
            i.disabled = !s.platforms;
            i.checked = s.platforms ? s.platforms.indexOf(i.value) > -1 : false;
        });
        $('#zfePlatformNote').classList.toggle('is-on', !s.platforms);
    }

    /* ── the model ── */
    function compute() {
        var sid = checked('service')[0] || 'saas';
        var s = PRICING.services[sid];
        var units = +range.value;
        var complexity = checked('complexity')[0] || 'standard';
        var platforms = s.platforms ? checked('platform') : ['web'];
        var addons = checked('addon');
        var priority = (checked('pace')[0] === 'priority');

        var perUnit = PRICING.hoursPerUnit[complexity] * s.mult;
        var core = units * perUnit;
        var extraP = Math.max(0, platforms.length - 1);
        var adapt = core * PRICING.extraPlatform * extraP;
        var discovery = s.discovery;

        var phases = [discovery, core + adapt, 0, 0];
        var lines = [
            ['Discovery & kickoff', discovery],
            ['Core UI · ' + units + ' ' + s.unit + ', ' + complexity, core]
        ];
        if (extraP) lines.push(['Platform adaptation · +' + extraP, adapt]);

        PRICING.addons.forEach(function (a) {
            var h = a.fixed + a.perUnit * units;
            var priceEl = root.querySelector('[data-addon-price="' + a.id + '"]');
            if (priceEl) priceEl.textContent = '+' + short(h * PRICING.rate);
            if (addons.indexOf(a.id) > -1) {
                phases[a.phase] += h;
                lines.push([a.name, h]);
            }
        });

        var handoff = (phases[1]) * PRICING.handoffShare;
        phases[3] = handoff;
        lines.push(['Developer handoff', handoff]);

        var hours = phases.reduce(function (a, b) { return a + b; }, 0);
        var markup = priority ? 1 + PRICING.priorityMarkup : 1;
        var cost = hours * PRICING.rate * markup;
        if (priority) lines.push(['Priority start', hours * PRICING.priorityMarkup]);

        var r = PRICING.roundTo;
        var low = Math.max(r, Math.floor(cost * PRICING.spread[0] / r) * r);
        var high = Math.ceil(cost * PRICING.spread[1] / r) * r;

        var team = PRICING.team.filter(function (t) { return hours >= t; }).length + 1;
        if (priority) team += 1;
        var weeks = Math.max(1, Math.ceil(hours / (team * PRICING.hoursPerWeek)));
        var weeksHigh = weeks + Math.max(1, Math.ceil(weeks * 0.25));

        return {
            service: s, units: units, complexity: complexity, platforms: platforms, priority: priority,
            hours: hours, low: low, high: high, weeks: weeks, weeksHigh: weeksHigh, team: team,
            phases: phases, lines: lines
        };
    }

    /* ── render ── */
    function render() {
        paintRange();
        var e = compute();

        tween($('#zfeScopeNum'), 'units', e.units, function (v) { return Math.round(v); });
        $('#zfeScopeUnit').textContent = e.units === 1 ? e.service.unit.replace(/s$/, '') : e.service.unit;

        $('#zfePrice').classList.toggle('is-long', e.high >= 100000);
        tween($('#zfeLow'), 'low', e.low, money);
        tween($('#zfeHigh'), 'high', e.high, money);
        $('#zfeService').textContent = e.service.name + ' · ' + Math.round(e.hours) + ' design hours';
        $('#zfeWeeks').textContent = e.weeks + '–' + e.weeksHigh + ' weeks';
        $('#zfeKickoff').textContent = e.priority ? 'kickoff in 48 hours' : 'from kickoff';
        $('#zfeTeam').textContent = e.team + (e.team === 1 ? ' designer' : ' designers');
        $('#zfeMbarValue').textContent = short(e.low) + ' – ' + short(e.high);
        $('#zfeMbarLabel').textContent = 'Your estimate · ' + e.weeks + '–' + e.weeksHigh + ' weeks';

        var total = e.hours || 1;
        var bars = $$('#zfeBar span');
        var legend = $$('#zfeLegend b');
        e.phases.forEach(function (h, i) {
            bars[i].style.flexGrow = Math.max(h, 0.001);
            bars[i].style.display = h > 0 ? '' : 'none';
            legend[i].textContent = Math.round(h / total * 100) + '%';
        });

        $('#zfeLines').innerHTML = e.lines.map(function (l) {
            var plus = l[0] === 'Priority start' ? '+' : '';
            return '<li><span>' + l[0] + '</span><span>' + plus + money(Math.round(l[1] * PRICING.rate / 50) * 50) + '</span></li>';
        }).join('');

        // hand the estimate to the contact page
        var q = 'estimate=' + encodeURIComponent(e.service.name + ', ' + e.units + ' ' + e.service.unit + ', ' + e.complexity +
            ', ' + money(e.low) + '-' + money(e.high) + ', ' + e.weeks + '-' + e.weeksHigh + ' weeks');
        $('#zfeCta').href = 'https://zeeframes.com/work-with-us?' + q;
    }

    /* ── events ── */
    form.addEventListener('change', function (ev) {
        if (ev.target.name === 'service') applyService(ev.target.value);
        if (ev.target.name === 'platform' && !checked('platform').length) ev.target.checked = true; // keep at least one
        render();
    });

    range.addEventListener('input', render);

    $$('.zfe-stepper button').forEach(function (b) {
        b.addEventListener('click', function () {
            var v = Math.min(+range.max, Math.max(+range.min, +range.value + +b.dataset.step));
            range.value = v;
            render();
        });
    });

    /* mobile bar: hide while the result card itself is visible */
    var mbar = $('#zfeMbar');
    if ('IntersectionObserver' in window && mbar) {
        new IntersectionObserver(function (entries) {
            mbar.classList.toggle('is-hidden', entries[0].isIntersecting);
        }, { threshold: 0.25 }).observe($('#zfeResult'));
    }

    applyService('saas');
    render();
})();
