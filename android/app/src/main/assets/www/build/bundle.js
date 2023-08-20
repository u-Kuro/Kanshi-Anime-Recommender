
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function split_css_unit(value) {
        const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
        return split ? [parseFloat(split[1]), split[2] || 'px'] : [value, 'px'];
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
        return style.sheet;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }
    class HtmlTag {
        constructor(is_svg = false) {
            this.is_svg = false;
            this.is_svg = is_svg;
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                if (this.is_svg)
                    this.e = svg_element(target.nodeName);
                /** #7364  target for <template> may be provided as #document-fragment(11) */
                else
                    this.e = element((target.nodeType === 11 ? 'TEMPLATE' : target.nodeName));
                this.t = target.tagName !== 'TEMPLATE' ? target : target.content;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.nodeName === 'TEMPLATE' ? this.e.content.childNodes : this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { ownerNode } = info.stylesheet;
                // there is no ownerNode if it runs on jsdom.
                if (ownerNode)
                    detach(ownerNode);
            });
            managed_styles.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately after the component has been updated.
     *
     * The first time the callback runs will be after the initial `onMount`
     */
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    const null_transition = { duration: 0 };
    function create_out_transition(node, fn, params) {
        const options = { direction: 'out' };
        let config = fn(node, params, options);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config(options);
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        const options = { direction: 'both' };
        let config = fn(node, params, options);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = (program.b - t);
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config(options);
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                console.error(list);
                throw new Error(`Cannot have duplicate keys in a keyed each: ${JSON.stringify(key)} is a Duplicate.`);
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const version$1 = 132;
    async function getWebVersion() {
        try {
            let path = window.location.pathname;
            path = path.endsWith('/') ? path : path + '/';
            path = path.includes('/index.html') ? path.replace('/index.html', '') : path;
            let response = await fetch(`${path}version.json`, {
                cache: "no-store"
            });
            let result = await response.json();
            return result.version || version$1
        } catch (error) { return version$1 }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const isJsonObject = (obj) => {
      return Object.prototype.toString.call(obj) === "[object Object]"
    };

    const jsonIsEmpty = (obj) => {
      for (const key in obj) {
        return false;
      }
      return true;
    };

    function msToTime(duration, limit) {
      try {
        let seconds = Math.floor((duration / 1000) % 60),
          minutes = Math.floor((duration / (1000 * 60)) % 60),
          hours = Math.floor((duration / (1000 * 60 * 60)) % 24),
          days = Math.floor((duration / (1000 * 60 * 60 * 24)) % 7),
          weeks = Math.floor((duration / (1000 * 60 * 60 * 24 * 7)) % 4),
          months = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4)) % 12),
          years = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12)) % 10),
          decades = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12 * 10)) % 10),
          century = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12 * 10 * 10)) % 10),
          millenium = Math.floor((duration / (1000 * 60 * 60 * 24 * 7 * 4 * 12 * 10 * 10 * 10)) % 10);
        let time = [];
        if (millenium <= 0 && century <= 0 && decades <= 0 && years <= 0 && months <= 0 && weeks <= 0 && days <= 0 && hours <= 0 && minutes <= 0 && seconds <= 0) return "0s"
        if (millenium > 0) time.push(`${millenium}mil`);
        if (decades > 0) time.push(`${decades}dec`);
        if (years > 0) time.push(`${years}y`);
        if (months > 0) time.push(`${months}mon`);
        if (weeks > 0) time.push(`${weeks}w`);
        if (days > 0) time.push(`${days}d`);
        if (hours > 0) time.push(`${hours}h`);
        if (minutes > 0) time.push(`${minutes}m`);
        if (seconds > 0) time.push(`${seconds}s`);
        if (limit > 0) {
          time = time.slice(0, limit);
        }
        return time.join(" ")
      } catch (e) {
        return
      }
    }

    function getMostVisibleElementFromArray(parent, elements, intersectionRatioThreshold = 0.5) {
      try {
        if (!elements.length) return null;
        let mostVisibleElement = null;
        var highestVisibleRatio = 0;
        let parentRect = parent.getBoundingClientRect();
        if (elements instanceof HTMLCollection) {
          elements = Array.from(elements);
        }
        elements?.forEach?.((child) => {
          let childRect = child.getBoundingClientRect();
          var intersectionHeight = Math.min(childRect.bottom, parentRect.bottom) - Math.max(childRect.top, parentRect.top);
          var intersectionRatio = intersectionHeight / childRect.height;
          if (intersectionRatio > highestVisibleRatio) {
            if (intersectionRatioThreshold === 0 && intersectionRatio > intersectionRatioThreshold) {
              highestVisibleRatio = intersectionRatio;
              mostVisibleElement = child;
            } else if (intersectionRatio >= intersectionRatioThreshold) {
              highestVisibleRatio = intersectionRatio;
              mostVisibleElement = child;
            }
          }
        });
        return mostVisibleElement;
      } catch (ex) {
        // console.error(ex)
        return
      }
    }

    function isElementVisible(parent, element, intersectionRatioThreshold = 0) {
      try {
        var boundingRect = element.getBoundingClientRect();
        var parentRect = parent.getBoundingClientRect();
        var overflowX = getComputedStyle(parent).overflowX;
        var overflowY = getComputedStyle(parent).overflowY;
        var isParentScrollable = overflowX === 'auto' || overflowX === 'scroll' || overflowY === 'auto' || overflowY === 'scroll';
        if (isParentScrollable) {
          var scrollLeft = parent.scrollLeft;
          var scrollTop = parent.scrollTop;
          var isVisible = (
            boundingRect.top >= parentRect.top &&
            boundingRect.left >= parentRect.left &&
            boundingRect.bottom <= parentRect.bottom &&
            boundingRect.right <= parentRect.right
          );
          if (!isVisible) {
            var intersectionTop = Math.max(boundingRect.top, parentRect.top) - Math.min(boundingRect.bottom, parentRect.bottom);
            var intersectionLeft = Math.max(boundingRect.left, parentRect.left) - Math.min(boundingRect.right, parentRect.right);
            var intersectionArea = intersectionTop * intersectionLeft;
            var elementArea = Math.min(boundingRect.height, window.innerHeight) * Math.min(boundingRect.width, window.innerWidth);
            var intersectionRatio = intersectionArea / elementArea;
            isVisible = intersectionRatio >= intersectionRatioThreshold;
          }
          if (!isVisible) {
            return false;
          }
          boundingRect = {
            top: boundingRect.top - parentRect.top + scrollTop,
            left: boundingRect.left - parentRect.left + scrollLeft,
            bottom: boundingRect.bottom - parentRect.top + scrollTop,
            right: boundingRect.right - parentRect.left + scrollLeft,
            height: boundingRect.height,
            width: boundingRect.width
          };
        }
        var windowHeight = window.innerHeight || document.documentElement.clientHeight;
        var windowWidth = window.innerWidth || document.documentElement.clientWidth;
        var isVisibleInWindow = (
          boundingRect.top >= 0 &&
          boundingRect.left >= 0 &&
          boundingRect.bottom <= windowHeight &&
          boundingRect.right <= windowWidth
        );
        return isVisibleInWindow;
      } catch (ex) {
        // console.error(ex)
        return
      }
    }

    const getChildIndex = (childElement, condition) => {
      try {
        return Array.from(childElement.parentElement.children).indexOf(childElement);
      } catch (ex) {
        // console.error(ex)
        return
      }
    };

    const scrollToElement = (parent, target, position = 'top', behavior, offset = 0) => {
      try {
        let scrollAmount;
        if (typeof target === "string") target = document.querySelector(target);
        if (parent === window) {
          const targetRect = target.getBoundingClientRect();
          const scrollY = window.scrollY;
          if (position === 'bottom') {
            scrollAmount = targetRect.bottom + scrollY - window.innerHeight;
          } else if (position === 'center') {
            scrollAmount = targetRect.top + scrollY - (window.innerHeight / 2);
          } else {
            scrollAmount = targetRect.top + scrollY;
          }
        } else {
          if (typeof parent === "string") parent = document.querySelector(parent);
          if (position === 'bottom') {
            scrollAmount = target.offsetTop + target.offsetHeight - parent.offsetHeight;
          } else if (position === 'center') {
            let targetRect = target.getBoundingClientRect();
            let parentRect = parent.getBoundingClientRect();
            let targetCenter = targetRect.top + targetRect.height / 2;
            let parentCenter = parentRect.top + parentRect.height / 2;
            scrollAmount = targetCenter - parentCenter + parent.scrollTop - parentRect.height / 2;
          } else {
            let targetRect = target.getBoundingClientRect();
            let parentRect = parent.getBoundingClientRect();
            scrollAmount = targetRect.top - parentRect.top + parent.scrollTop;
          }
        }
        if (parent === window) {
          if (behavior === 'smooth') {
            window.scrollTo({
              top: scrollAmount + offset,
              behavior: 'smooth'
            });
          } else {
            window.scrollTo({ top: scrollAmount + offset });
          }
        } else {
          if (behavior === 'smooth') {
            parent.scrollBy({
              top: scrollAmount + offset,
              behavior: "smooth"
            });
          } else {
            parent.scrollTop = scrollAmount + offset;
          }
        }
      } catch (ex) {
        // console.error(ex)
        return
      }
    };

    const formatNumber = (number, dec = 2) => {
      if (typeof number === "number") {
        const formatter = new Intl.NumberFormat("en-US", {
          maximumFractionDigits: dec, // display up to 2 decimal places
          minimumFractionDigits: 0, // display at least 0 decimal places
          notation: "compact", // use compact notation for large numbers
          compactDisplay: "short", // use short notation for large numbers (K, M, etc.)
        });

        if (Math.abs(number) >= 1000) {
          return formatter.format(number);
        } else if (Math.abs(number) < 0.01) {
          return number.toExponential(0);
        } else {
          return (
            number.toFixed(dec) ||
            number.toLocaleString("en-US", { maximumFractionDigits: dec })
          );
        }
      } else {
        return null;
      }
    };

    const ncsCompare = (str1, str2) => {
      if (typeof str1 !== "string" || typeof str2 !== "string") {
        return false;
      }
      return str1.toLowerCase() === str2.toLowerCase();
    };

    const changeInputValue = (inputElement, newValue) => {
      let selectionStart = Math.max(inputElement.selectionStart - 1 || 0, 0);
      inputElement.value = newValue;
      inputElement.setSelectionRange(selectionStart, selectionStart);
    };

    const dragScroll = (element, axis = 'xy') => {
      var curYPos, curXPos, curDown, curScrollLeft, curScrollTop;

      let move = (e) => {
        if (curDown && e.pointerType === "mouse") {
          if (axis.toLowerCase().includes('y'))
            element.scrollTop = curYPos - e.pageY + curScrollTop;
          if (axis.toLowerCase().includes('x'))
            element.scrollLeft = curXPos - e.pageX + curScrollLeft;
        }
      };

      let down = (e) => {
        if (e.pointerType !== "mouse") return
        if (axis.toLowerCase().includes('y')) {
          curYPos = e.pageY;
          curScrollTop = element.scrollTop;
        }
        if (axis.toLowerCase().includes('x')) {
          curXPos = e.pageX;
          curScrollLeft = element.scrollLeft;
        }
        curDown = true;
      };

      let up = (e) => {
        if (e.pointerType !== "mouse") return
        curDown = false;
      };

      element.addEventListener('pointermove', move);
      element.addEventListener('pointerdown', down);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      return () => {
        element.removeEventListener('pointermove', move);
        element.removeEventListener('pointerdown', down);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
    };

    const isAndroid = () => {
      try {
        JSBridge.exportJSON; // Android Interface
        return true
      } catch (e) {
        return false
      }
    };

    let $_pastExportUrl;
    const downloadLink = (url, fileName) => {
      if ($_pastExportUrl) {
        setTimeout(() => URL.revokeObjectURL($_pastExportUrl), 0);
      }
      $_pastExportUrl = url;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      return
    };

    const addClass = (element, className) => {
      element?.classList?.add?.(className);
    };

    const removeClass = (element, className) => {
      element?.classList?.remove?.(className);
    };

    const LocalStorageID = "Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70";
    const getLocalStorage = (key) => {
      let data;
      try {
        key = LocalStorageID + key;
        data = localStorage.getItem(key);
        return JSON.parse(data)
      } catch (ex) {
        return data ?? null;
      }
    };
    const setLocalStorage = (key, data) => {
      try {
        localStorage.setItem(LocalStorageID + key, data);
      } catch (ex) { }
    };

    const appID = writable(null);
    const android = writable(null);
    const inApp = writable(true);
    const progress = writable(0);
    // const anilistAccessToken = writable(null)
    const hasWheel = writable(false);

    const username = writable(getLocalStorage('username') || null);
    const hiddenEntries = writable(null);

    const filterOptions = writable(null);
    const activeTagFilters = writable(null);
    const finalAnimeList = writable(null);
    const animeLoaderWorker$1 = writable(null);
    const dataStatus = writable(null);

    const isImporting = writable(false);
    const userRequestIsRunning = writable(null);
    const autoUpdate = writable(getLocalStorage('autoUpdate') || null);
    const autoUpdateInterval = writable(null);
    const lastRunnedAutoUpdateDate = writable(null);

    const exportPathIsAvailable = writable(getLocalStorage('exportPathIsAvailable') || null);
    const autoExport = writable(getLocalStorage('autoExport') || null);
    const autoExportInterval = writable(null);
    const lastRunnedAutoExportDate = writable(null);

    const ytPlayers = writable([]);
    const autoPlay = writable(getLocalStorage('autoPlay') || null);

    const initData = writable(true);
    const gridFullView = writable(getLocalStorage('gridFullView') || null);

    const checkAnimeLoaderStatus = writable(false);
    const animeObserver = writable(null);
    const animeIdxRemoved = writable(null);
    const shownAllInList = writable(false);
    const searchedAnimeKeyword = writable("");
    const numberOfNextLoadedGrid = writable(null);
    const confirmPromise = writable(null);
    const menuVisible = writable(false);
    const animeOptionVisible = writable(false);
    const openedAnimeOptionIdx = writable(null);
    const popupVisible = writable(false);
    const openedAnimePopupIdx = writable(null);
    const shouldGoBack = writable(true);
    const listUpdateAvailable = writable(false);
    const popupIsGoingBack = writable(false);
    const isScrolling = writable(null);
    const scrollingTimeout = writable(null);
    const asyncAnimeReloaded = writable(null);
    // Reactive Functions
    const runUpdate = writable(null);
    const runExport = writable(null);
    const importantUpdate = writable(null);
    const importantLoad = writable(null);
    const updateRecommendationList = writable(null);
    const updateFilters = writable(null);
    const loadAnime = writable(null);
    const runIsScrolling = writable(null);

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        const [xValue, xUnit] = split_css_unit(x);
        const [yValue, yUnit] = split_css_unit(y);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src\components\Anime\AnimeGrid.svelte generated by Svelte v3.59.1 */

    const { console: console_1$2 } = globals;
    const file$7 = "src\\components\\Anime\\AnimeGrid.svelte";

    function get_each_context_3$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[46] = list[i];
    	return child_ctx;
    }

    function get_each_context_4$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[46] = list[i];
    	return child_ctx;
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[46] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[46] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[51] = list[i];
    	child_ctx[52] = list;
    	child_ctx[53] = i;
    	return child_ctx;
    }

    // (577:8) {:else}
    function create_else_block_2$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "No Results";
    			attr_dev(div, "class", "empty svelte-1t56oil");
    			add_location(div, file$7, 577, 12, 22869);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2$1.name,
    		type: "else",
    		source: "(577:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (568:48) 
    function create_if_block_4$3(ctx) {
    	let t;
    	let each1_anchor;
    	let each_value_4 = Array(21);
    	validate_each_argument(each_value_4);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_1[i] = create_each_block_4$1(get_each_context_4$1(ctx, each_value_4, i));
    	}

    	let each_value_3 = Array(5);
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3$2(get_each_context_3$2(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each1_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$3.name,
    		type: "if",
    		source: "(568:48) ",
    		ctx
    	});

    	return block;
    }

    // (452:8) {#if $finalAnimeList?.length}
    function create_if_block_1$5(ctx) {
    	let each_blocks_2 = [];
    	let each0_lookup = new Map();
    	let t0;
    	let t1;
    	let each2_anchor;
    	let each_value_2 = /*$finalAnimeList*/ ctx[9] || [];
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*anime*/ ctx[51].id;
    	validate_each_keys(ctx, each_value_2, get_each_context_2$2, get_key);

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2$2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_2[i] = create_each_block_2$2(key, child_ctx));
    	}

    	let each_value_1 = Array(/*$numberOfNextLoadedGrid*/ ctx[8] ?? /*numberOfLoadedGrid*/ ctx[13]);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	let each_value = Array(/*$gridFullView*/ ctx[10] ?? getLocalStorage("gridFullView") ?? !/*$android*/ ctx[11]
    	? Math.floor((/*windowHeight*/ ctx[0] ?? 1100) / 220)
    	: 5);

    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t0 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each2_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t0, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each2_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*getBriefInfo, $finalAnimeList, $popupVisible, handleOpenPopup, handleOpenOption, cancelOpenOption, getShownScore, $filterOptions, date, getUserStatusColor, numberOfLoadedGrid*/ 1040994) {
    				each_value_2 = /*$finalAnimeList*/ ctx[9] || [];
    				validate_each_argument(each_value_2);
    				validate_each_keys(ctx, each_value_2, get_each_context_2$2, get_key);
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key, 1, ctx, each_value_2, each0_lookup, t0.parentNode, destroy_block, create_each_block_2$2, t0, get_each_context_2$2);
    			}

    			if (dirty[0] & /*$finalAnimeList, $shownAllInList, loadingMore, $numberOfNextLoadedGrid*/ 904) {
    				each_value_1 = Array(/*$numberOfNextLoadedGrid*/ ctx[8] ?? /*numberOfLoadedGrid*/ ctx[13]);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(t1.parentNode, t1);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*$gridFullView, $android, windowHeight*/ 3073) {
    				each_value = Array(/*$gridFullView*/ ctx[10] ?? getLocalStorage("gridFullView") ?? !/*$android*/ ctx[11]
    				? Math.floor((/*windowHeight*/ ctx[0] ?? 1100) / 220)
    				: 5);

    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each2_anchor.parentNode, each2_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].d(detaching);
    			}

    			if (detaching) detach_dev(t0);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(452:8) {#if $finalAnimeList?.length}",
    		ctx
    	});

    	return block;
    }

    // (569:12) {#each Array(21) as _}
    function create_each_block_4$1(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "shimmer svelte-1t56oil");
    			add_location(div0, file$7, 570, 20, 22664);
    			attr_dev(div1, "class", "image-grid__card skeleton svelte-1t56oil");
    			add_location(div1, file$7, 569, 16, 22603);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4$1.name,
    		type: "each",
    		source: "(569:12) {#each Array(21) as _}",
    		ctx
    	});

    	return block;
    }

    // (574:12) {#each Array(5) as _}
    function create_each_block_3$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "image-grid__card svelte-1t56oil");
    			add_location(div, file$7, 574, 16, 22785);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3$2.name,
    		type: "each",
    		source: "(574:12) {#each Array(5) as _}",
    		ctx
    	});

    	return block;
    }

    // (523:40) {:else}
    function create_else_block_1$2(ctx) {
    	let t_value = `${/*anime*/ ctx[51].format || "N/A"}${/*anime*/ ctx[51].episodes
	? "(" + /*anime*/ ctx[51].episodes + ")"
	: ""}` + "";

    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t_value !== (t_value = `${/*anime*/ ctx[51].format || "N/A"}${/*anime*/ ctx[51].episodes
			? "(" + /*anime*/ ctx[51].episodes + ")"
			: ""}` + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$2.name,
    		type: "else",
    		source: "(523:40) {:else}",
    		ctx
    	});

    	return block;
    }

    // (513:40) {#if isJsonObject(anime?.nextAiringEpisode)}
    function create_if_block_3$3(ctx) {
    	let previous_key = /*date*/ ctx[1]?.getSeconds?.() || 1;
    	let key_block_anchor;
    	let key_block = create_key_block$1(ctx);

    	const block = {
    		c: function create() {
    			key_block.c();
    			key_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			key_block.m(target, anchor);
    			insert_dev(target, key_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*date*/ 2 && safe_not_equal(previous_key, previous_key = /*date*/ ctx[1]?.getSeconds?.() || 1)) {
    				key_block.d(1);
    				key_block = create_key_block$1(ctx);
    				key_block.c();
    				key_block.m(key_block_anchor.parentNode, key_block_anchor);
    			} else {
    				key_block.p(ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(key_block_anchor);
    			key_block.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$3.name,
    		type: "if",
    		source: "(513:40) {#if isJsonObject(anime?.nextAiringEpisode)}",
    		ctx
    	});

    	return block;
    }

    // (514:44) {#key date?.getSeconds?.() || 1}
    function create_key_block$1(ctx) {
    	let t_value = `${/*anime*/ ctx[51].format || "N/A"}${getFinishedEpisode(/*anime*/ ctx[51].episodes, /*anime*/ ctx[51].nextAiringEpisode)}
                                        ` + "";

    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t_value !== (t_value = `${/*anime*/ ctx[51].format || "N/A"}${getFinishedEpisode(/*anime*/ ctx[51].episodes, /*anime*/ ctx[51].nextAiringEpisode)}
                                        ` + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block$1.name,
    		type: "key",
    		source: "(514:44) {#key date?.getSeconds?.() || 1}",
    		ctx
    	});

    	return block;
    }

    // (541:40) {:else}
    function create_else_block$2(ctx) {
    	let t_value = (formatNumber(/*anime*/ ctx[51].weightedScore) || "N/A") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t_value !== (t_value = (formatNumber(/*anime*/ ctx[51].weightedScore) || "N/A") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(541:40) {:else}",
    		ctx
    	});

    	return block;
    }

    // (539:40) {#if $filterOptions}
    function create_if_block_2$3(ctx) {
    	let t_value = (/*getShownScore*/ ctx[18](/*anime*/ ctx[51]) || "N/A") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t_value !== (t_value = (/*getShownScore*/ ctx[18](/*anime*/ ctx[51]) || "N/A") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(539:40) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (453:12) {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}
    function create_each_block_2$2(key_1, ctx) {
    	let div3;
    	let div2;
    	let img;
    	let img_loading_value;
    	let img_alt_value;
    	let img_src_value;
    	let t0;
    	let span4;
    	let span0;
    	let t1_value = (getTitle$1(/*anime*/ ctx[51]?.title) || "N/A") + "";
    	let t1;
    	let span0_copy_value_value;
    	let t2;
    	let span3;
    	let div0;
    	let span1;
    	let i0;
    	let i0_class_value;
    	let t3;
    	let show_if;
    	let div0_date_value;
    	let t4;
    	let div1;
    	let span2;
    	let i1;
    	let i1_class_value;
    	let t5;
    	let span3_copy_value_value;
    	let div2_tabindex_value;
    	let div3_title_value;
    	let each_value_2 = /*each_value_2*/ ctx[52];
    	let animeIdx = /*animeIdx*/ ctx[53];
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (dirty[0] & /*$finalAnimeList*/ 512) show_if = null;
    		if (show_if == null) show_if = !!isJsonObject(/*anime*/ ctx[51]?.nextAiringEpisode);
    		if (show_if) return create_if_block_3$3;
    		return create_else_block_1$2;
    	}

    	let current_block_type = select_block_type_1(ctx, [-1, -1]);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[5]) return create_if_block_2$3;
    		return create_else_block$2;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	function pointerdown_handler(...args) {
    		return /*pointerdown_handler*/ ctx[23](/*animeIdx*/ ctx[53], ...args);
    	}

    	function keydown_handler(...args) {
    		return /*keydown_handler*/ ctx[24](/*animeIdx*/ ctx[53], ...args);
    	}

    	const assign_div3 = () => /*div3_binding*/ ctx[25](div3, each_value_2, animeIdx);
    	const unassign_div3 = () => /*div3_binding*/ ctx[25](null, each_value_2, animeIdx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			img = element("img");
    			t0 = space();
    			span4 = element("span");
    			span0 = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			span3 = element("span");
    			div0 = element("div");
    			span1 = element("span");
    			i0 = element("i");
    			t3 = space();
    			if_block0.c();
    			t4 = space();
    			div1 = element("div");
    			span2 = element("span");
    			i1 = element("i");
    			t5 = space();
    			if_block1.c();

    			attr_dev(img, "loading", img_loading_value = /*animeIdx*/ ctx[53] > /*numberOfLoadedGrid*/ ctx[13]
    			? "lazy"
    			: "eager");

    			attr_dev(img, "class", "" + (null_to_empty("image-grid__card-thumb  fade-out") + " svelte-1t56oil"));
    			attr_dev(img, "alt", img_alt_value = (getTitle$1(/*anime*/ ctx[51]?.title) || "") + " Cover");
    			if (!src_url_equal(img.src, img_src_value = /*anime*/ ctx[51].coverImageUrl || "")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "180px");
    			attr_dev(img, "height", "254.531px");
    			add_location(img, file$7, 469, 24, 17345);
    			attr_dev(span0, "class", "title copy svelte-1t56oil");
    			attr_dev(span0, "copy-value", span0_copy_value_value = getTitle$1(/*anime*/ ctx[51]?.title) || "");
    			add_location(span0, file$7, 491, 28, 18481);
    			attr_dev(i0, "class", i0_class_value = "" + (null_to_empty(`${/*getUserStatusColor*/ ctx[19](/*anime*/ ctx[51].userStatus)}-color fa-solid fa-circle`) + " svelte-1t56oil"));
    			add_location(i0, file$7, 507, 40, 19304);
    			add_location(span1, file$7, 506, 36, 19256);
    			attr_dev(div0, "class", "brief-info svelte-1t56oil");
    			attr_dev(div0, "date", div0_date_value = JSON.stringify(/*anime*/ ctx[51]?.nextAiringEpisode));
    			add_location(div0, file$7, 500, 32, 18958);
    			attr_dev(i1, "class", i1_class_value = "" + (null_to_empty(`${getCautionColor$1(/*anime*/ ctx[51])}-color fa-solid fa-star`) + " svelte-1t56oil"));
    			add_location(i1, file$7, 533, 40, 20877);
    			add_location(span2, file$7, 532, 36, 20829);
    			attr_dev(div1, "class", "brief-info svelte-1t56oil");
    			add_location(div1, file$7, 531, 32, 20767);
    			attr_dev(span3, "class", "brief-info-wrapper copy svelte-1t56oil");
    			attr_dev(span3, "copy-value", span3_copy_value_value = getTitle$1(/*anime*/ ctx[51]?.title) || "");
    			add_location(span3, file$7, 496, 28, 18748);
    			attr_dev(span4, "class", "image-grid__card-title svelte-1t56oil");
    			add_location(span4, file$7, 490, 24, 18414);
    			attr_dev(div2, "class", "shimmer svelte-1t56oil");
    			attr_dev(div2, "tabindex", div2_tabindex_value = /*$popupVisible*/ ctx[6] ? "" : "0");
    			add_location(div2, file$7, 459, 20, 16810);
    			attr_dev(div3, "class", "image-grid__card svelte-1t56oil");
    			attr_dev(div3, "title", div3_title_value = /*getBriefInfo*/ ctx[17](/*anime*/ ctx[51]));
    			add_location(div3, file$7, 453, 16, 16543);
    			this.first = div3;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, img);
    			append_dev(div2, t0);
    			append_dev(div2, span4);
    			append_dev(span4, span0);
    			append_dev(span0, t1);
    			append_dev(span4, t2);
    			append_dev(span4, span3);
    			append_dev(span3, div0);
    			append_dev(div0, span1);
    			append_dev(span1, i0);
    			append_dev(span1, t3);
    			if_block0.m(span1, null);
    			append_dev(span3, t4);
    			append_dev(span3, div1);
    			append_dev(div1, span2);
    			append_dev(span2, i1);
    			append_dev(span2, t5);
    			if_block1.m(span2, null);
    			assign_div3();

    			if (!mounted) {
    				dispose = [
    					listen_dev(img, "load", /*load_handler*/ ctx[21], false, false, false, false),
    					listen_dev(img, "error", /*error_handler*/ ctx[22], false, false, false, false),
    					listen_dev(
    						div2,
    						"click",
    						function () {
    							if (is_function(/*handleOpenPopup*/ ctx[14](/*animeIdx*/ ctx[53]))) /*handleOpenPopup*/ ctx[14](/*animeIdx*/ ctx[53]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(div2, "pointerdown", pointerdown_handler, false, false, false, false),
    					listen_dev(div2, "pointerup", /*cancelOpenOption*/ ctx[16], false, false, false, false),
    					listen_dev(div2, "pointercancel", /*cancelOpenOption*/ ctx[16], false, false, false, false),
    					listen_dev(div2, "keydown", keydown_handler, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 512 && img_loading_value !== (img_loading_value = /*animeIdx*/ ctx[53] > /*numberOfLoadedGrid*/ ctx[13]
    			? "lazy"
    			: "eager")) {
    				attr_dev(img, "loading", img_loading_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && img_alt_value !== (img_alt_value = (getTitle$1(/*anime*/ ctx[51]?.title) || "") + " Cover")) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && !src_url_equal(img.src, img_src_value = /*anime*/ ctx[51].coverImageUrl || "")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && t1_value !== (t1_value = (getTitle$1(/*anime*/ ctx[51]?.title) || "N/A") + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && span0_copy_value_value !== (span0_copy_value_value = getTitle$1(/*anime*/ ctx[51]?.title) || "")) {
    				attr_dev(span0, "copy-value", span0_copy_value_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && i0_class_value !== (i0_class_value = "" + (null_to_empty(`${/*getUserStatusColor*/ ctx[19](/*anime*/ ctx[51].userStatus)}-color fa-solid fa-circle`) + " svelte-1t56oil"))) {
    				attr_dev(i0, "class", i0_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx, dirty)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(span1, null);
    				}
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && div0_date_value !== (div0_date_value = JSON.stringify(/*anime*/ ctx[51]?.nextAiringEpisode))) {
    				attr_dev(div0, "date", div0_date_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && i1_class_value !== (i1_class_value = "" + (null_to_empty(`${getCautionColor$1(/*anime*/ ctx[51])}-color fa-solid fa-star`) + " svelte-1t56oil"))) {
    				attr_dev(i1, "class", i1_class_value);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_2(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(span2, null);
    				}
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && span3_copy_value_value !== (span3_copy_value_value = getTitle$1(/*anime*/ ctx[51]?.title) || "")) {
    				attr_dev(span3, "copy-value", span3_copy_value_value);
    			}

    			if (dirty[0] & /*$popupVisible*/ 64 && div2_tabindex_value !== (div2_tabindex_value = /*$popupVisible*/ ctx[6] ? "" : "0")) {
    				attr_dev(div2, "tabindex", div2_tabindex_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && div3_title_value !== (div3_title_value = /*getBriefInfo*/ ctx[17](/*anime*/ ctx[51]))) {
    				attr_dev(div3, "title", div3_title_value);
    			}

    			if (each_value_2 !== /*each_value_2*/ ctx[52] || animeIdx !== /*animeIdx*/ ctx[53]) {
    				unassign_div3();
    				each_value_2 = /*each_value_2*/ ctx[52];
    				animeIdx = /*animeIdx*/ ctx[53];
    				assign_div3();
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block0.d();
    			if_block1.d();
    			unassign_div3();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$2.name,
    		type: "each",
    		source: "(453:12) {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}",
    		ctx
    	});

    	return block;
    }

    // (553:12) {#each Array($numberOfNextLoadedGrid ?? numberOfLoadedGrid) as _}
    function create_each_block_1$2(ctx) {
    	let div1;
    	let div0;
    	let div1_class_value;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "shimmer svelte-1t56oil");
    			add_location(div0, file$7, 561, 20, 22218);

    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty("image-grid__card skeleton anime-loaded-padding " + (/*$finalAnimeList*/ ctx[9]?.length && !/*$shownAllInList*/ ctx[7] && /*loadingMore*/ ctx[3]
    			? ""
    			: "disable-interaction")) + " svelte-1t56oil"));

    			add_location(div1, file$7, 553, 16, 21869);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList, $shownAllInList, loadingMore*/ 648 && div1_class_value !== (div1_class_value = "" + (null_to_empty("image-grid__card skeleton anime-loaded-padding " + (/*$finalAnimeList*/ ctx[9]?.length && !/*$shownAllInList*/ ctx[7] && /*loadingMore*/ ctx[3]
    			? ""
    			: "disable-interaction")) + " svelte-1t56oil"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(553:12) {#each Array($numberOfNextLoadedGrid ?? numberOfLoadedGrid) as _}",
    		ctx
    	});

    	return block;
    }

    // (565:12) {#each Array($gridFullView ?? getLocalStorage("gridFullView") ?? !$android ? Math.floor((windowHeight ?? 1100) / 220) : 5) as _}
    function create_each_block$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "image-grid__card svelte-1t56oil");
    			add_location(div, file$7, 565, 16, 22446);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(565:12) {#each Array($gridFullView ?? getLocalStorage(\\\"gridFullView\\\") ?? !$android ? Math.floor((windowHeight ?? 1100) / 220) : 5) as _}",
    		ctx
    	});

    	return block;
    }

    // (581:4) {#if !$android && $gridFullView && animeGridEl?.scrollLeft > 500}
    function create_if_block$6(ctx) {
    	let div;
    	let i;
    	let div_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "fa-solid fa-arrow-left svelte-1t56oil");
    			add_location(i, file$7, 589, 12, 23324);
    			attr_dev(div, "class", "go-back-grid svelte-1t56oil");
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file$7, 582, 8, 23076);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*goBackGrid*/ ctx[20], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_1*/ ctx[28], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: -50, duration: 300 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: -50, duration: 300 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(581:4) {#if !$android && $gridFullView && animeGridEl?.scrollLeft > 500}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let main;
    	let div;
    	let div_class_value;
    	let t;
    	let main_class_value;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*$finalAnimeList*/ ctx[9]?.length) return create_if_block_1$5;
    		if (!/*$finalAnimeList*/ ctx[9] || /*$initData*/ ctx[12]) return create_if_block_4$3;
    		return create_else_block_2$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = !/*$android*/ ctx[11] && /*$gridFullView*/ ctx[10] && /*animeGridEl*/ ctx[2]?.scrollLeft > 500 && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "id", "anime-grid");

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("image-grid " + (/*$gridFullView*/ ctx[10] ?? getLocalStorage("gridFullView") ?? !/*$android*/ ctx[11]
    			? "fullView"
    			: "") + (/*$finalAnimeList*/ ctx[9]?.length === 0 && !/*$initData*/ ctx[12]
    			? "empty"
    			: "")) + " svelte-1t56oil"));

    			set_style(div, "--anime-grid-height", /*windowHeight*/ ctx[0] + "px");
    			add_location(div, file$7, 429, 4, 15503);

    			attr_dev(main, "class", main_class_value = "" + (null_to_empty(/*$gridFullView*/ ctx[10] ?? getLocalStorage("gridFullView") ?? !/*$android*/ ctx[11]
    			? "fullView"
    			: "") + " svelte-1t56oil"));

    			add_location(main, file$7, 424, 0, 15378);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			if_block0.m(div, null);
    			/*div_binding*/ ctx[26](div);
    			append_dev(main, t);
    			if (if_block1) if_block1.m(main, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "wheel", /*wheel_handler*/ ctx[27], { passive: true }, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div, null);
    				}
    			}

    			if (!current || dirty[0] & /*$gridFullView, $android, $finalAnimeList, $initData*/ 7680 && div_class_value !== (div_class_value = "" + (null_to_empty("image-grid " + (/*$gridFullView*/ ctx[10] ?? getLocalStorage("gridFullView") ?? !/*$android*/ ctx[11]
    			? "fullView"
    			: "") + (/*$finalAnimeList*/ ctx[9]?.length === 0 && !/*$initData*/ ctx[12]
    			? "empty"
    			: "")) + " svelte-1t56oil"))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty[0] & /*windowHeight*/ 1) {
    				set_style(div, "--anime-grid-height", /*windowHeight*/ ctx[0] + "px");
    			}

    			if (!/*$android*/ ctx[11] && /*$gridFullView*/ ctx[10] && /*animeGridEl*/ ctx[2]?.scrollLeft > 500) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$android, $gridFullView, animeGridEl*/ 3076) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$6(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(main, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*$gridFullView, $android*/ 3072 && main_class_value !== (main_class_value = "" + (null_to_empty(/*$gridFullView*/ ctx[10] ?? getLocalStorage("gridFullView") ?? !/*$android*/ ctx[11]
    			? "fullView"
    			: "") + " svelte-1t56oil"))) {
    				attr_dev(main, "class", main_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block0.d();
    			/*div_binding*/ ctx[26](null);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getCautionColor$1({ contentCaution, meanScoreAll, meanScoreAbove, score }) {
    	if (contentCaution?.caution?.length) {
    		// Caution
    		return "red";
    	} else if (contentCaution?.semiCaution?.length) {
    		// Semi Caution
    		return "teal";
    	} else if (score < meanScoreAll) {
    		// Very Low Score
    		return "purple";
    	} else if (score < meanScoreAbove) {
    		// Low Score
    		return "orange";
    	} else {
    		return "green";
    	}
    }

    function getFinishedEpisode(episodes, nextAiringEpisode) {
    	let timeDifMS;
    	let nextEpisode;

    	if (typeof nextAiringEpisode?.episode === "number" && typeof nextAiringEpisode?.airingAt === "number") {
    		let nextAiringDate = new Date(nextAiringEpisode?.airingAt * 1000);
    		nextEpisode = nextAiringEpisode?.episode;

    		if (nextAiringDate instanceof Date && !isNaN(nextAiringDate)) {
    			timeDifMS = nextAiringDate.getTime() - new Date().getTime();
    		}
    	}

    	if (timeDifMS > 0 && nextEpisode > 1 && episodes > nextEpisode) {
    		return `(${nextEpisode - 1}/${episodes})`;
    	} else if (timeDifMS <= 0 && typeof nextEpisode === "number" && episodes > nextEpisode) {
    		return `(${nextEpisode}/${episodes})`;
    	} else if (typeof episodes === "number") {
    		return `(${episodes})`;
    	} else if (typeof nextEpisode === "number") {
    		if (timeDifMS > 0 && nextEpisode > 1) {
    			return `(${nextEpisode - 1}")`;
    		} else if (timeDifMS <= 0) {
    			return `(${nextEpisode}")`;
    		}
    	}

    	return "";
    }

    function horizontalWheel$1(event, parentClass) {
    	let element = event.target;
    	let classList = element.classList;

    	if (!classList.contains(parentClass)) {
    		element = element.closest("." + parentClass);
    	}

    	if (element.scrollWidth <= element.clientWidth) return;

    	if (event.deltaY !== 0 && event.deltaX === 0) {
    		element.scrollLeft = Math.max(0, element.scrollLeft + event.deltaY);
    	}
    }

    function getTitle$1(title) {
    	return title?.english || title?.userPreferred || title?.romaji || title?.native || "";
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $filterOptions;
    	let $animeOptionVisible;
    	let $openedAnimeOptionIdx;
    	let $popupVisible;
    	let $openedAnimePopupIdx;
    	let $animeLoaderWorker;
    	let $checkAnimeLoaderStatus;
    	let $shownAllInList;
    	let $asyncAnimeReloaded;
    	let $animeObserver;
    	let $numberOfNextLoadedGrid;
    	let $finalAnimeList;
    	let $dataStatus;
    	let $animeIdxRemoved;
    	let $importantLoad;
    	let $gridFullView;
    	let $android;
    	let $initData;
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(5, $filterOptions = $$value));
    	validate_store(animeOptionVisible, 'animeOptionVisible');
    	component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(34, $animeOptionVisible = $$value));
    	validate_store(openedAnimeOptionIdx, 'openedAnimeOptionIdx');
    	component_subscribe($$self, openedAnimeOptionIdx, $$value => $$invalidate(35, $openedAnimeOptionIdx = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(6, $popupVisible = $$value));
    	validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
    	component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(36, $openedAnimePopupIdx = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(37, $animeLoaderWorker = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(38, $checkAnimeLoaderStatus = $$value));
    	validate_store(shownAllInList, 'shownAllInList');
    	component_subscribe($$self, shownAllInList, $$value => $$invalidate(7, $shownAllInList = $$value));
    	validate_store(asyncAnimeReloaded, 'asyncAnimeReloaded');
    	component_subscribe($$self, asyncAnimeReloaded, $$value => $$invalidate(39, $asyncAnimeReloaded = $$value));
    	validate_store(animeObserver, 'animeObserver');
    	component_subscribe($$self, animeObserver, $$value => $$invalidate(40, $animeObserver = $$value));
    	validate_store(numberOfNextLoadedGrid, 'numberOfNextLoadedGrid');
    	component_subscribe($$self, numberOfNextLoadedGrid, $$value => $$invalidate(8, $numberOfNextLoadedGrid = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(9, $finalAnimeList = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(41, $dataStatus = $$value));
    	validate_store(animeIdxRemoved, 'animeIdxRemoved');
    	component_subscribe($$self, animeIdxRemoved, $$value => $$invalidate(42, $animeIdxRemoved = $$value));
    	validate_store(importantLoad, 'importantLoad');
    	component_subscribe($$self, importantLoad, $$value => $$invalidate(43, $importantLoad = $$value));
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(10, $gridFullView = $$value));
    	validate_store(android, 'android');
    	component_subscribe($$self, android, $$value => $$invalidate(11, $android = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(12, $initData = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AnimeGrid', slots, []);
    	let windowHeight = window.visualViewport.height;
    	let date = new Date();
    	let animeGridEl;
    	let isRunningIntersectEvent;
    	let numberOfLoadedGrid = 13;
    	let observerDelay = 1000, loadingMore = false;

    	function addLastAnimeObserver() {
    		isRunningIntersectEvent = false;

    		set_store_value(
    			animeObserver,
    			$animeObserver = new IntersectionObserver(entries => {
    					if ($shownAllInList) return;

    					entries.forEach(entry => {
    						if (entry.isIntersecting) {
    							$$invalidate(3, loadingMore = true);
    							if (isRunningIntersectEvent) return;
    							isRunningIntersectEvent = true;

    							setTimeout(
    								() => {
    									if ($animeLoaderWorker instanceof Worker) {
    										$checkAnimeLoaderStatus().then(() => {
    											$animeLoaderWorker?.postMessage?.({ loadMore: true });
    										});
    									}

    									isRunningIntersectEvent = false;
    								},
    								observerDelay
    							);
    						}
    					});
    				},
    			{
    					root: null,
    					rootMargin: "100%",
    					threshold: [0, 1]
    				}),
    			$animeObserver
    		);
    	}

    	onMount(() => {
    		$$invalidate(0, windowHeight = window.visualViewport.height);
    		$$invalidate(2, animeGridEl = animeGridEl || document.getElementById("anime-grid"));

    		window.addEventListener("resize", () => {
    			$$invalidate(0, windowHeight = window.visualViewport.height);
    		});

    		setInterval(
    			() => {
    				$$invalidate(1, date = new Date());
    			},
    			1000
    		);
    	});

    	let animeLoaderIsAlivePromise, checkAnimeLoaderStatusTimeout, isAsyncLoad = false;

    	window.checkAnimeLoaderStatus = set_store_value(
    		checkAnimeLoaderStatus,
    		$checkAnimeLoaderStatus = async () => {
    			if ($animeLoaderWorker instanceof Worker && typeof $animeLoaderWorker.onmessage === "function") {
    				return new Promise((resolve, reject) => {
    						animeLoaderIsAlivePromise = { resolve, reject };
    						$animeLoaderWorker?.postMessage?.({ checkStatus: true });
    						clearTimeout(checkAnimeLoaderStatusTimeout);

    						checkAnimeLoaderStatusTimeout = setTimeout(
    							() => {
    								reject();
    							},
    							1000
    						);
    					}).catch(() => {
    					set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    					set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);
    					set_store_value(importantLoad, $importantLoad = !$importantLoad, $importantLoad);
    					animeLoaderIsAlivePromise = null;
    				}).finally(() => {
    					animeLoaderIsAlivePromise = null;
    				});
    			}
    		},
    		$checkAnimeLoaderStatus
    	);

    	animeLoaderWorker$1.subscribe(val => {
    		if (val instanceof Worker) {
    			val.onmessage = async ({ data }) => {
    				if (animeLoaderIsAlivePromise?.resolve) {
    					if (data?.isAlive) {
    						animeLoaderIsAlivePromise?.resolve?.();
    						animeLoaderIsAlivePromise = null;
    					}
    				}

    				await tick();

    				if (data?.status !== undefined) set_store_value(dataStatus, $dataStatus = data.status, $dataStatus); else if (data.finalAnimeList instanceof Array) {
    					if (data?.reload === true) {
    						set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
    						isAsyncLoad = true;
    						set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid, $numberOfNextLoadedGrid);
    					} else if (data.isNew === true) {
    						set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
    						set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid, $numberOfNextLoadedGrid);
    					} else if (data.isNew === false) {
    						if ($finalAnimeList instanceof Array) {
    							set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList.concat(data.finalAnimeList), $finalAnimeList);

    							if (data.isLast) {
    								set_store_value(shownAllInList, $shownAllInList = true, $shownAllInList);

    								if ($animeObserver instanceof IntersectionObserver) {
    									$animeObserver.disconnect();
    									set_store_value(animeObserver, $animeObserver = null, $animeObserver);
    								}
    							}
    						}

    						set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid, $numberOfNextLoadedGrid);
    					}
    				} else if (data.isRemoved === true && typeof data.removedID === "number") {
    					let maxGridElIdx = Math.max($finalAnimeList.length - 2, 0);
    					let gridElement = $finalAnimeList[maxGridElIdx].gridElement || animeGridEl.children?.[maxGridElIdx];

    					if ($animeObserver instanceof IntersectionObserver && gridElement instanceof Element) {
    						$animeObserver.observe(gridElement);
    					}

    					let removedIdx = $finalAnimeList.findIndex(({ id }) => id === data.removedID);
    					set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList.filter(({ id }) => id !== data.removedID), $finalAnimeList);

    					if (removedIdx >= 0) {
    						set_store_value(animeIdxRemoved, $animeIdxRemoved = removedIdx, $animeIdxRemoved);
    					}

    					set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid, $numberOfNextLoadedGrid);
    				}
    			};

    			val.onerror = error => {
    				set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);
    				console.error(error);
    			};
    		}
    	});

    	finalAnimeList.subscribe(async val => {
    		if (val instanceof Array && val.length) {
    			if ($shownAllInList) {
    				set_store_value(shownAllInList, $shownAllInList = false, $shownAllInList);
    			}

    			if ($animeObserver) {
    				$animeObserver.disconnect();
    				set_store_value(animeObserver, $animeObserver = null, $animeObserver);
    			}

    			await tick();
    			addLastAnimeObserver();
    			let gridElementIdx = $finalAnimeList.length - 1;
    			let gridElement = $finalAnimeList[gridElementIdx].gridElement || animeGridEl.children?.[gridElementIdx];

    			if ($animeObserver instanceof IntersectionObserver) {
    				if (gridElement instanceof Element) {
    					$animeObserver.observe(gridElement);
    				}

    				document.querySelectorAll(".anime-loaded-padding").forEach(item => {
    					$animeObserver.observe(item);
    				});
    			}

    			if (isAsyncLoad) {
    				set_store_value(asyncAnimeReloaded, $asyncAnimeReloaded = !$asyncAnimeReloaded, $asyncAnimeReloaded);
    				isAsyncLoad = false;
    			}

    			$$invalidate(3, loadingMore = false);
    		} else {
    			set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = null, $numberOfNextLoadedGrid);

    			if ($animeObserver) {
    				$animeObserver?.disconnect?.();
    				set_store_value(animeObserver, $animeObserver = null, $animeObserver);
    			}

    			if (isAsyncLoad) {
    				set_store_value(asyncAnimeReloaded, $asyncAnimeReloaded = !$asyncAnimeReloaded, $asyncAnimeReloaded);
    				isAsyncLoad = false;
    			}

    			$$invalidate(3, loadingMore = false);
    		}
    	});

    	searchedAnimeKeyword.subscribe(async val => {
    		if (typeof val === "string") {
    			if ($animeLoaderWorker instanceof Worker) {
    				set_store_value(shownAllInList, $shownAllInList = false, $shownAllInList);

    				$checkAnimeLoaderStatus().then(() => {
    					$animeLoaderWorker?.postMessage?.({ filterKeyword: val });
    				});
    			}
    		}
    	});

    	function handleOpenPopup(animeIdx) {
    		set_store_value(openedAnimePopupIdx, $openedAnimePopupIdx = animeIdx, $openedAnimePopupIdx);
    		set_store_value(popupVisible, $popupVisible = true, $popupVisible);
    	}

    	let openOptionTimeout;

    	function handleOpenOption(event, animeIdx) {
    		let element = event.target;
    		let classList = element.classList;
    		if (classList.contains("copy") || element.closest(".copy")) return;
    		if (openOptionTimeout) clearTimeout(openOptionTimeout);

    		openOptionTimeout = setTimeout(
    			() => {
    				set_store_value(openedAnimeOptionIdx, $openedAnimeOptionIdx = animeIdx, $openedAnimeOptionIdx);
    				set_store_value(animeOptionVisible, $animeOptionVisible = true, $animeOptionVisible);
    			},
    			500
    		);
    	}

    	function cancelOpenOption() {
    		if (openOptionTimeout) clearTimeout(openOptionTimeout);
    	}

    	function getBriefInfo(
    		{ contentCaution, sortedFavoriteContents, meanScoreAll, meanScoreAbove, score }
    	) {
    		let _sortedFavoriteContents = [];

    		sortedFavoriteContents?.forEach(e => {
    			if (typeof e === "string") {
    				_sortedFavoriteContents.push(e);
    			}
    		});

    		let _contentCaution = [];

    		if (score < meanScoreAll) {
    			// Very Low Score
    			_contentCaution.push(`Very Low Score (mean: ${formatNumber(meanScoreAll)})`);
    		} else if (score < meanScoreAbove) {
    			// Low Score
    			_contentCaution.push(`Low Score (mean: ${formatNumber(meanScoreAbove)})`);
    		}

    		_contentCaution = _contentCaution.concat(contentCaution?.caution || []).concat(contentCaution?.semiCaution || []);
    		let briefInfo = "";

    		if (_sortedFavoriteContents.length) {
    			briefInfo += "Favorite Contents: " + _sortedFavoriteContents.join(", ") || "";
    		}

    		if (_contentCaution.length) {
    			briefInfo += "\n\nContent Cautions: " + _contentCaution.join(", ");
    		}

    		return briefInfo;
    	}

    	function getShownScore({ weightedScore, score, averageScore, userScore }) {
    		let sortName = $filterOptions?.sortFilter?.filter(({ sortType }) => sortType !== "none")?.[0]?.sortName || "weighted score";

    		if (sortName === "score") {
    			return formatNumber(score);
    		} else if (sortName === "user score") {
    			return userScore;
    		} else if (sortName === "average score") {
    			return averageScore;
    		} else {
    			return formatNumber(weightedScore);
    		}
    	}

    	function getUserStatusColor(userStatus) {
    		if (ncsCompare(userStatus, "completed")) {
    			return "green";
    		} else if (ncsCompare(userStatus, "current") || ncsCompare(userStatus, "repeating")) {
    			return "blue";
    		} else if (ncsCompare(userStatus, "planning")) {
    			return "orange";
    		} else if (ncsCompare(userStatus, "paused")) {
    			return "peach";
    		} else if (ncsCompare(userStatus, "dropped")) {
    			return "red";
    		} else {
    			return "lightgrey"; // Default Unwatched Icon Color
    		}
    	}

    	function goBackGrid() {
    		$$invalidate(2, animeGridEl.style.overflow = "hidden", animeGridEl);
    		$$invalidate(2, animeGridEl.style.overflow = "", animeGridEl);

    		animeGridEl?.children?.[0]?.scrollIntoView?.({
    			container: animeGridEl,
    			behavior: "smooth",
    			block: "nearest",
    			inline: "start"
    		});
    	}

    	let scrollingToBottom;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<AnimeGrid> was created with unknown prop '${key}'`);
    	});

    	const load_handler = e => {
    		removeClass(e.target, "fade-out");
    		addClass(e.target?.closest?.(".shimmer"), "loaded");
    	};

    	const error_handler = e => {
    		addClass(e.target, "fade-out");
    		addClass(e.target, "display-none");
    	};

    	const pointerdown_handler = (animeIdx, e) => handleOpenOption(e, animeIdx);
    	const keydown_handler = (animeIdx, e) => e.key === "Enter" && handleOpenPopup(animeIdx);

    	function div3_binding($$value, each_value_2, animeIdx) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			each_value_2[animeIdx].gridElement = $$value;
    		});
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			animeGridEl = $$value;
    			$$invalidate(2, animeGridEl);
    		});
    	}

    	const wheel_handler = e => {
    		if ($gridFullView ?? getLocalStorage("gridFullView") ?? !$android) {
    			horizontalWheel$1(e, "image-grid");

    			if (!scrollingToBottom) {
    				$$invalidate(4, scrollingToBottom = true);
    				let newScrollPosition = window.scrollMaxY || Number.MAX_SAFE_INTEGER;
    				document.documentElement.scrollTop = newScrollPosition;
    				$$invalidate(4, scrollingToBottom = false);
    			}
    		}
    	};

    	const keydown_handler_1 = e => e.key === "Enter" && goBackGrid();

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		android,
    		finalAnimeList,
    		searchedAnimeKeyword,
    		animeLoaderWorker: animeLoaderWorker$1,
    		dataStatus,
    		filterOptions,
    		activeTagFilters,
    		animeObserver,
    		popupVisible,
    		openedAnimePopupIdx,
    		animeOptionVisible,
    		openedAnimeOptionIdx,
    		initData,
    		asyncAnimeReloaded,
    		animeIdxRemoved,
    		shownAllInList,
    		importantLoad,
    		checkAnimeLoaderStatus,
    		gridFullView,
    		numberOfNextLoadedGrid,
    		addClass,
    		formatNumber,
    		isJsonObject,
    		ncsCompare,
    		removeClass,
    		getLocalStorage,
    		fly,
    		windowHeight,
    		date,
    		animeGridEl,
    		isRunningIntersectEvent,
    		numberOfLoadedGrid,
    		observerDelay,
    		loadingMore,
    		addLastAnimeObserver,
    		animeLoaderIsAlivePromise,
    		checkAnimeLoaderStatusTimeout,
    		isAsyncLoad,
    		handleOpenPopup,
    		openOptionTimeout,
    		handleOpenOption,
    		cancelOpenOption,
    		getBriefInfo,
    		getShownScore,
    		getCautionColor: getCautionColor$1,
    		getUserStatusColor,
    		getFinishedEpisode,
    		horizontalWheel: horizontalWheel$1,
    		goBackGrid,
    		getTitle: getTitle$1,
    		scrollingToBottom,
    		$filterOptions,
    		$animeOptionVisible,
    		$openedAnimeOptionIdx,
    		$popupVisible,
    		$openedAnimePopupIdx,
    		$animeLoaderWorker,
    		$checkAnimeLoaderStatus,
    		$shownAllInList,
    		$asyncAnimeReloaded,
    		$animeObserver,
    		$numberOfNextLoadedGrid,
    		$finalAnimeList,
    		$dataStatus,
    		$animeIdxRemoved,
    		$importantLoad,
    		$gridFullView,
    		$android,
    		$initData
    	});

    	$$self.$inject_state = $$props => {
    		if ('windowHeight' in $$props) $$invalidate(0, windowHeight = $$props.windowHeight);
    		if ('date' in $$props) $$invalidate(1, date = $$props.date);
    		if ('animeGridEl' in $$props) $$invalidate(2, animeGridEl = $$props.animeGridEl);
    		if ('isRunningIntersectEvent' in $$props) isRunningIntersectEvent = $$props.isRunningIntersectEvent;
    		if ('numberOfLoadedGrid' in $$props) $$invalidate(13, numberOfLoadedGrid = $$props.numberOfLoadedGrid);
    		if ('observerDelay' in $$props) observerDelay = $$props.observerDelay;
    		if ('loadingMore' in $$props) $$invalidate(3, loadingMore = $$props.loadingMore);
    		if ('animeLoaderIsAlivePromise' in $$props) animeLoaderIsAlivePromise = $$props.animeLoaderIsAlivePromise;
    		if ('checkAnimeLoaderStatusTimeout' in $$props) checkAnimeLoaderStatusTimeout = $$props.checkAnimeLoaderStatusTimeout;
    		if ('isAsyncLoad' in $$props) isAsyncLoad = $$props.isAsyncLoad;
    		if ('openOptionTimeout' in $$props) openOptionTimeout = $$props.openOptionTimeout;
    		if ('scrollingToBottom' in $$props) $$invalidate(4, scrollingToBottom = $$props.scrollingToBottom);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		windowHeight,
    		date,
    		animeGridEl,
    		loadingMore,
    		scrollingToBottom,
    		$filterOptions,
    		$popupVisible,
    		$shownAllInList,
    		$numberOfNextLoadedGrid,
    		$finalAnimeList,
    		$gridFullView,
    		$android,
    		$initData,
    		numberOfLoadedGrid,
    		handleOpenPopup,
    		handleOpenOption,
    		cancelOpenOption,
    		getBriefInfo,
    		getShownScore,
    		getUserStatusColor,
    		goBackGrid,
    		load_handler,
    		error_handler,
    		pointerdown_handler,
    		keydown_handler,
    		div3_binding,
    		div_binding,
    		wheel_handler,
    		keydown_handler_1
    	];
    }

    class AnimeGrid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AnimeGrid",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    let loadedUrls = {};

    const cacheRequest = (url) => {
        return new Promise(async (resolve) => {
            if (get_store_value(android)) {
                resolve(url);
            } else {
                let _appID = get_store_value(appID);
                if (!_appID) {
                    _appID = await getWebVersion();
                    appID.set(_appID);
                }
                url = url + "?v=" + _appID;
                if (loadedUrls[url]) {
                    resolve(loadedUrls[url]);
                } else {
                    fetch(url, {
                        headers: {
                            'Cache-Control': 'max-age=31536000, immutable'
                        }
                    }).then(response => response.blob())
                        .then(blob => {
                            let bloburl = URL.createObjectURL(blob);
                            loadedUrls[url] = bloburl;
                            resolve(bloburl);
                        })
                        .catch(async () => {
                            resolve(url);
                        });
                }
            }
        })
    };

    let terminateDelay = 1000;
    let dataStatusPrio = false;
    let isExporting = false;

    let passedFilterOptions, passedActiveTagFilters;

    // Reactinve Functions
    let animeLoaderWorker;
    const animeLoader = (_data = {}) => {
        return new Promise((resolve, reject) => {
            dataStatusPrio = true;
            progress.set(0);
            cacheRequest("./webapi/worker/animeLoader.js")
                .then(url => {
                    if (animeLoaderWorker) {
                        animeLoaderWorker.terminate();
                        animeLoaderWorker = null;
                    }
                    if (_data?.filterOptions && _data?.activeTagFilters) {
                        passedFilterOptions = _data?.filterOptions;
                        passedActiveTagFilters = _data?.activeTagFilters;
                        _data.hasPassedFilters = true;
                    } else if (passedFilterOptions && passedActiveTagFilters) {
                        _data.filterOptions = passedFilterOptions;
                        _data.activeTagFilters = passedActiveTagFilters;
                        _data.hasPassedFilters = true;
                    }
                    animeLoaderWorker = new Worker(url);
                    animeLoaderWorker.postMessage(_data);
                    animeLoaderWorker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("progress")) {
                            if (data?.progress >= 0 && data?.progress <= 100) {
                                progress.set(data.progress);
                            }
                        } else if (data?.hasOwnProperty("status")) {
                            dataStatusPrio = true;
                            dataStatus.set(data.status);
                        } else if (data?.isNew) {
                            if (data?.hasPassedFilters === true) {
                                passedFilterOptions = passedActiveTagFilters = undefined;
                            }
                            dataStatusPrio = false;
                            animeLoaderWorker.onmessage = null;
                            progress.set(100);
                            resolve(Object.assign({}, data, { animeLoaderWorker: animeLoaderWorker }));
                        }
                    };
                    animeLoaderWorker.onerror = (error) => {
                        progress.set(100);
                        reject(error);
                    };
                })
                .catch((error) => {
                    progress.set(100);
                    alertError();
                    reject(error);
                });
        })
    };
    let processRecommendedAnimeListTerminateTimeout;
    let processRecommendedAnimeListWorker;
    const processRecommendedAnimeList = (_data = {}) => {
        return new Promise((resolve, reject) => {
            dataStatusPrio = true;
            if (processRecommendedAnimeListWorker) processRecommendedAnimeListWorker.terminate();
            progress.set(0);
            cacheRequest("./webapi/worker/processRecommendedAnimeList.js")
                .then(url => {
                    if (processRecommendedAnimeListTerminateTimeout) clearTimeout(processRecommendedAnimeListTerminateTimeout);
                    if (_data?.filterOptions && _data?.activeTagFilters) {
                        passedFilterOptions = _data?.filterOptions;
                        passedActiveTagFilters = _data?.activeTagFilters;
                        _data.hasPassedFilters = true;
                    } else if (passedFilterOptions && passedActiveTagFilters) {
                        _data.filterOptions = passedFilterOptions;
                        _data.activeTagFilters = passedActiveTagFilters;
                        _data.hasPassedFilters = true;
                    }
                    processRecommendedAnimeListWorker = new Worker(url);
                    processRecommendedAnimeListWorker.postMessage(_data);
                    processRecommendedAnimeListWorker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("progress")) {
                            if (data?.progress >= 0 && data?.progress <= 100) {
                                progress.set(data.progress);
                            }
                        } else if (data?.hasOwnProperty("status")) {
                            dataStatusPrio = true;
                            dataStatus.set(data.status);
                        } else if (data?.animeReleaseNotification) {
                            if (get_store_value(android)) {
                                try {
                                    let aniReleaseNotif = data?.animeReleaseNotification;
                                    if (
                                        typeof aniReleaseNotif?.releaseEpisodes === "number"
                                        && typeof aniReleaseNotif?.releaseDateMillis === "number"
                                        && typeof aniReleaseNotif?.maxEpisode === "number"
                                        && typeof aniReleaseNotif?.title === "string"
                                        && typeof aniReleaseNotif?.id === "number"
                                        && typeof aniReleaseNotif?.isMyAnime === "boolean"
                                        && typeof aniReleaseNotif?.imageURL === "string"
                                    ) {
                                        JSBridge.addAnimeReleaseNotification(
                                            aniReleaseNotif.id,
                                            aniReleaseNotif.title,
                                            aniReleaseNotif.releaseEpisodes,
                                            aniReleaseNotif.maxEpisode,
                                            aniReleaseNotif.releaseDateMillis,
                                            aniReleaseNotif?.imageURL,
                                            aniReleaseNotif.isMyAnime
                                        );
                                    }
                                } catch (e) { }
                            }
                        } else {
                            if (data?.hasPassedFilters === true) {
                                passedFilterOptions = passedActiveTagFilters = undefined;
                            }
                            dataStatusPrio = false;
                            processRecommendedAnimeListTerminateTimeout = setTimeout(() => {
                                processRecommendedAnimeListWorker.terminate();
                            }, terminateDelay);
                            progress.set(100);
                            resolve();
                        }
                    };
                    processRecommendedAnimeListWorker.onerror = (error) => {
                        progress.set(100);
                        reject(error);
                    };
                }).catch((error) => {
                    progress.set(100);
                    alertError();
                    reject(error);
                });
        });
    };
    let requestAnimeEntriesTerminateTimeout, requestAnimeEntriesWorker;
    const requestAnimeEntries = (_data) => {
        return new Promise((resolve, reject) => {
            if (requestAnimeEntriesWorker) requestAnimeEntriesWorker.terminate();
            progress.set(0);
            cacheRequest("./webapi/worker/requestAnimeEntries.js")
                .then(url => {
                    requestAnimeEntriesWorker = new Worker(url);
                    if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout);
                    requestAnimeEntriesWorker.postMessage(_data);
                    requestAnimeEntriesWorker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("progress")) {
                            if (!dataStatusPrio && data?.progress >= 0 && data?.progress <= 100) {
                                progress.set(data.progress);
                            }
                        } else if (data?.hasOwnProperty("status")) {
                            if (!dataStatusPrio) {
                                dataStatus.set(data.status);
                            }
                        } else if (data?.updateRecommendationList !== undefined) {
                            updateRecommendationList.update(e => !e);
                        } else if (data?.lastRunnedAutoUpdateDate instanceof Date && !isNaN(data?.lastRunnedAutoUpdateDate)) {
                            lastRunnedAutoUpdateDate.set(data.lastRunnedAutoUpdateDate);
                        } else if (data?.errorDuringInit !== undefined) {
                            resolve(data);
                        } else {
                            requestAnimeEntriesTerminateTimeout = setTimeout(() => {
                                requestAnimeEntriesWorker.terminate();
                            }, terminateDelay);
                            progress.set(100);
                            resolve(data);
                        }
                    };
                    requestAnimeEntriesWorker.onerror = (error) => {
                        progress.set(100);
                        reject(error);
                    };
                }).catch((error) => {
                    progress.set(100);
                    alertError();
                    reject(error);
                });
        })
    };
    let requestUserEntriesTerminateTimeout, requestUserEntriesWorker;
    const requestUserEntries = (_data) => {
        return new Promise((resolve, reject) => {
            if (!get_store_value(initData)) {
                if (isExporting || get_store_value(isImporting)) {
                    userRequestIsRunning.set(false);
                }
            }
            if (requestUserEntriesWorker) requestUserEntriesWorker.terminate();
            progress.set(0);
            cacheRequest("./webapi/worker/requestUserEntries.js")
                .then(url => {
                    requestUserEntriesWorker = new Worker(url);
                    if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout);
                    requestUserEntriesWorker.postMessage(_data);
                    requestUserEntriesWorker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("progress")) {
                            if (!dataStatusPrio && data?.progress >= 0 && data?.progress <= 100) {
                                progress.set(data.progress);
                            }
                        } else if (data?.hasOwnProperty("status")) {
                            if (!dataStatusPrio) {
                                dataStatus.set(data.status);
                                if (data.status === "User not found") {
                                    userRequestIsRunning.set(false);
                                    loadAnime.update((e) => !e);
                                    window.confirmPromise({
                                        isAlert: true,
                                        text: "User is not found, you may want to try again..."
                                    });
                                    requestUserEntriesTerminateTimeout = setTimeout(() => {
                                        requestUserEntriesWorker.terminate();
                                    }, terminateDelay);
                                    progress.set(100);
                                    reject(data);
                                }
                            }
                        } else if (data?.error) {
                            userRequestIsRunning.set(false);
                            loadAnime.update((e) => !e);
                            requestUserEntriesTerminateTimeout = setTimeout(() => {
                                requestUserEntriesWorker.terminate();
                            }, terminateDelay);
                            progress.set(100);
                            reject(data);
                        } else if (data?.updateRecommendationList !== undefined) {
                            updateRecommendationList.update(e => !e);
                        } else {
                            userRequestIsRunning.set(false);
                            requestUserEntriesTerminateTimeout = setTimeout(() => {
                                requestUserEntriesWorker.terminate();
                            }, terminateDelay);
                            progress.set(100);
                            resolve(data);
                        }
                    };
                    requestUserEntriesWorker.onerror = (error) => {
                        userRequestIsRunning.set(false);
                        loadAnime.update((e) => !e);
                        requestUserEntriesTerminateTimeout = setTimeout(() => {
                            requestUserEntriesWorker.terminate();
                        }, terminateDelay);
                        progress.set(100);
                        reject(error);
                    };
                }).catch((error) => {
                    userRequestIsRunning.set(false);
                    progress.set(100);
                    loadAnime.update((e) => !e);
                    alertError();
                    reject(error);
                });
        })
    };

    let exportUserDataWorker;
    const exportUserData = (_data) => {
        return new Promise((resolve, reject) => {
            if (!get_store_value(initData)) {
                if (get_store_value(isImporting)) return
                stopConflictingWorkers();
                isExporting = true;
            }
            if (exportUserDataWorker) exportUserDataWorker.terminate();
            progress.set(0);
            cacheRequest("./webapi/worker/exportUserData.js")
                .then(url => {
                    exportUserDataWorker = new Worker(url);
                    if (get_store_value(android)) {
                        exportUserDataWorker.postMessage('android');
                    } else {
                        exportUserDataWorker.postMessage('browser');
                    }
                    exportUserDataWorker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("progress")) {
                            if (data?.progress >= 0 && data?.progress <= 100) {
                                progress.set(data.progress);
                            }
                        } else if (data?.hasOwnProperty("status")) {
                            dataStatusPrio = true;
                            dataStatus.set(data.status);
                        } else if (get_store_value(android)) {
                            dataStatusPrio = false;
                            let chunk = data.chunk;
                            let state = data.state;
                            // 0 - start | 1 - ongoing | 2 - done
                            if (state === 0) {
                                JSBridge.exportJSON('', 0, '');
                            } else if (state === 1) {
                                JSBridge.exportJSON(chunk, 1, '');
                            } else if (state === 2) {
                                let username = data.username ?? null;
                                JSBridge.exportJSON(chunk, 2, `Kanshi.${username?.toLowerCase() || "Backup"}.json`);
                                progress.set(100);
                                exportUserDataWorker.terminate();
                                isExporting = false;
                                resolve(data);
                            }
                        } else {
                            dataStatusPrio = false;
                            let username = data.username ?? null;
                            progress.set(100);
                            downloadLink(data.url, `Kanshi.${username?.toLowerCase() || "Backup"}.json`);
                            isExporting = false;
                            resolve(data);
                            // dont terminate, can't oversee blob link lifetime
                        }
                    };
                    exportUserDataWorker.onerror = (error) => {
                        progress.set(100);
                        isExporting = false;
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Export Failed",
                            text: "Data is not exported, please try again in a later time.",
                        });
                        reject(error);
                    };
                }).catch((error) => {
                    progress.set(100);
                    isExporting = false;
                    alertError();
                    reject(error);
                });
        })
    };
    let importUserDataTerminateTimeout, importUserDataWorker;
    const importUserData = (_data) => {
        return new Promise((resolve, reject) => {
            if (!get_store_value(initData)) {
                if (isExporting) return
                stopConflictingWorkers();
                isImporting.set(true);
            }
            if (importUserDataWorker) importUserDataWorker.terminate();
            progress.set(0);
            cacheRequest("./webapi/worker/importUserData.js")
                .then(url => {
                    importUserDataWorker = new Worker(url);
                    if (importUserDataTerminateTimeout) clearTimeout(importUserDataTerminateTimeout);
                    importUserDataWorker.postMessage(_data);
                    importUserDataWorker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("progress")) {
                            if (data?.progress >= 0 && data?.progress <= 100) {
                                progress.set(data.progress);
                            }
                        } else if (data?.error !== undefined) {
                            isImporting.set(false);
                            loadAnime.update((e) => !e);
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Import Failed",
                                text: "File has not been imported, please ensure that file is in a supported format (e.g., .json)",
                            });
                            progress.set(100);
                            reject(data?.error || "Something went wrong...");
                        } else if (data?.hasOwnProperty("status")) {
                            dataStatusPrio = true;
                            dataStatus.set(data.status);
                        } else if (typeof data?.importedUsername === "string") {
                            username.set(data.importedUsername);
                        } else if (isJsonObject(data?.importedHiddenEntries)) {
                            hiddenEntries.set(data?.importedHiddenEntries);
                        } else if (data?.importedlastRunnedAutoUpdateDate instanceof Date && !isNaN(data?.importedlastRunnedAutoUpdateDate)) {
                            lastRunnedAutoUpdateDate.set(data.importedlastRunnedAutoUpdateDate);
                        } else if (data?.importedlastRunnedAutoExportDate instanceof Date && !isNaN(data?.importedlastRunnedAutoExportDate)) {
                            lastRunnedAutoExportDate.set(data.importedlastRunnedAutoExportDate);
                        } else if (data?.updateFilters !== undefined) {
                            isImporting.set(false);
                            getFilterOptions()
                                .then((data) => {
                                    activeTagFilters.set(data.activeTagFilters);
                                    filterOptions.set(data.filterOptions);
                                });
                        } else if (data?.updateRecommendationList !== undefined) {
                            isImporting.set(false);
                            importantUpdate.update(e => !e);
                        } else {
                            isImporting.set(false);
                            runUpdate.update(e => !e);
                            dataStatusPrio = false;
                            importUserDataTerminateTimeout = setTimeout(() => {
                                importUserDataWorker.terminate();
                            }, terminateDelay);
                            progress.set(100);
                            resolve(data);
                        }
                    };
                    importUserDataWorker.onerror = (error) => {
                        isImporting.set(false);
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Import Failed",
                            text: "File has not been imported, please ensure that file is in a supported format (e.g., .json)",
                        });
                        loadAnime.update((e) => !e);
                        progress.set(100);
                        reject(error || "Something went wrong...");
                    };
                }).catch((error) => {
                    progress.set(100);
                    isImporting.set(false);
                    loadAnime.update((e) => !e);
                    alertError();
                    reject(error);
                });
        })
    };

    // IndexedDB
    const getIDBdata = (name) => {
        return new Promise((resolve, reject) => {
            cacheRequest("./webapi/worker/getIDBdata.js")
                .then(url => {
                    let worker = new Worker(url);
                    worker.postMessage({ name: name });
                    worker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("status")) {
                            dataStatus.set(data.status);
                        } else {
                            worker.terminate();
                            resolve(data);
                        }
                    };
                    worker.onerror = (error) => {
                        reject(error);
                    };
                }).catch(() => {
                    alertError();
                    reject(error);
                });
        })
    };
    const saveIDBdata = (_data, name) => {
        return new Promise((resolve, reject) => {
            cacheRequest("./webapi/worker/saveIDBdata.js")
                .then(url => {
                    let worker = new Worker(url);
                    worker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("status")) {
                            dataStatus.set(data.status);
                        } else {
                            setTimeout(() => {
                                worker.terminate();
                                worker = null;
                            }, terminateDelay);
                            resolve();
                        }
                    };
                    worker.onerror = (error) => {
                        reject(error);
                    };
                    worker.postMessage({ data: _data, name: name });
                    if (typeof _data === "boolean") {
                        setLocalStorage(name, _data);
                    }
                }).catch((error) => {
                    alertError();
                    reject(error);
                });
        })
    };

    // One Time Use
    let getAnimeEntriesTerminateTimeout, gettingAnimeEntriesInterval;
    const getAnimeEntries = (_data) => {
        return new Promise((resolve, reject) => {
            gettingAnimeEntriesInterval = setInterval(() => {
                dataStatus.set("Getting Anime Entries");
            }, 300);
            progress.set(0);
            cacheRequest("./webapi/worker/getAnimeEntries.js")
                .then(url => {
                    progress.set(25);
                    if (gettingAnimeEntriesInterval) {
                        clearInterval(gettingAnimeEntriesInterval);
                        gettingAnimeEntriesInterval = null;
                    }
                    let worker = new Worker(url);
                    if (getAnimeEntriesTerminateTimeout) clearTimeout(getAnimeEntriesTerminateTimeout);
                    worker.postMessage(_data);
                    worker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("status")) {
                            dataStatusPrio = true;
                            dataStatus.set(data.status);
                        } else {
                            progress.set(100);
                            dataStatusPrio = false;
                            updateRecommendationList.update(e => !e);
                            getAnimeEntriesTerminateTimeout = setTimeout(() => {
                                worker.terminate();
                            }, terminateDelay);
                            resolve(data);
                        }
                    };
                    worker.onerror = (error) => {
                        progress.set(100);
                        reject(error);
                    };
                }).catch((error) => {
                    progress.set(100);
                    if (gettingAnimeEntriesInterval) {
                        clearInterval(gettingAnimeEntriesInterval);
                        gettingAnimeEntriesInterval = null;
                    }
                    dataStatus.set(null);
                    alertError();
                    reject(error);
                });
        })
    };

    let getFilterOptionsTerminateTimeout, getFilterOptionsInterval, getFilterOptionsWorker;
    const getFilterOptions = (_data) => {
        return new Promise((resolve, reject) => {
            getFilterOptionsInterval = setInterval(() => {
                if (!gettingAnimeEntriesInterval) {
                    dataStatus.set("Getting Filters");
                }
            }, 300);
            cacheRequest("./webapi/worker/getFilterOptions.js")
                .then(url => {
                    if (getFilterOptionsInterval) {
                        clearInterval(getFilterOptionsInterval);
                        getFilterOptionsInterval = null;
                    }
                    if (getFilterOptionsWorker) getFilterOptionsWorker.terminate();
                    getFilterOptionsWorker = new Worker(url);
                    if (getFilterOptionsTerminateTimeout) clearTimeout(getFilterOptionsTerminateTimeout);
                    getFilterOptionsWorker.postMessage(_data);
                    getFilterOptionsWorker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("status")) {
                            dataStatusPrio = true;
                            dataStatus.set(data.status);
                        } else {
                            dataStatusPrio = false;
                            getFilterOptionsTerminateTimeout = setTimeout(() => {
                                getFilterOptionsWorker.terminate();
                            }, terminateDelay);
                            resolve(data);
                        }
                    };
                    getFilterOptionsWorker.onerror = (error) => {
                        reject(error);
                    };
                }).catch((error) => {
                    if (getFilterOptionsInterval) {
                        clearInterval(getFilterOptionsInterval);
                        getFilterOptionsInterval = null;
                    }
                    dataStatus.set(null);
                    alertError();
                    reject(error);
                });
        })
    };

    function stopConflictingWorkers() {
        progress.set(0);
        requestAnimeEntriesWorker?.terminate?.();
        requestUserEntriesWorker?.terminate?.();
        userRequestIsRunning.set(false);
        importUserDataWorker?.terminate?.();
        isImporting.set(false);
        exportUserDataWorker?.terminate?.();
        isExporting = false;
        getFilterOptionsWorker?.terminate?.();
        clearInterval(gettingAnimeEntriesInterval);
        gettingAnimeEntriesInterval = null;
        clearInterval(getFilterOptionsInterval);
        getFilterOptionsInterval = null;
        dataStatus.set(null);
    }

    function alertError() {
        if (get_store_value(android)) {
            window.confirmPromise?.({
                isAlert: true,
                title: "Something Went Wrong",
                text: "App may not be working properly, you may want to restart and make sure you're running the latest version.",
            });
        } else {
            window.confirmPromise?.({
                isAlert: true,
                title: "Something Went Wrong",
                text: "App may not be working properly, you may want to refresh the page, or if not clear the cookies but backup your data first.",
            });
        }
    }

    function saveJSON(data, name) {
        return new Promise(async (resolve, reject) => {
            await saveIDBdata(data, name)
                .then((message) => {
                    resolve(message);
                })
                .catch((error) => {
                    reject(error);
                });
        })
    }
    async function retrieveJSON(name) {
        return new Promise(async (resolve, reject) => {
            await getIDBdata(name)
                .then((data) => {
                    resolve(data);
                })
                .catch((error) => {
                    reject(error);
                });
        })
    }

    /* src\components\Anime\Fixed\AnimePopup.svelte generated by Svelte v3.59.1 */

    const { Object: Object_1 } = globals;
    const file$6 = "src\\components\\Anime\\Fixed\\AnimePopup.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[110] = list[i];
    	child_ctx[111] = list;
    	child_ctx[112] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[113] = list[i].tag;
    	child_ctx[114] = list[i].tagColor;
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[117] = list[i].genre;
    	child_ctx[118] = list[i].genreColor;
    	return child_ctx;
    }

    function get_each_context_3$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[121] = list[i].studio;
    	child_ctx[122] = list[i].studioColor;
    	return child_ctx;
    }

    // (1503:8) {#if $finalAnimeList?.length}
    function create_if_block_3$2(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t;
    	let if_block_anchor;
    	let current;
    	let each_value = /*$finalAnimeList*/ ctx[10] || [];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*anime*/ ctx[110].id;
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	let if_block = /*$finalAnimeList*/ ctx[10]?.length && !/*$shownAllInList*/ ctx[13] && create_if_block_4$2(ctx);

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList, $popupIsGoingBack, handleMoreVideos, handleHideShow, getHiddenStatus, windowWidth, windowHeight, fullDescriptionPopup, fullImagePopup, getTags, getGenres, getStudios, getUserStatusColor, date, getFormattedAnimeFormat, updateList, $listUpdateAvailable, $autoPlay, askToOpenYoutube*/ 33529209) {
    				each_value = /*$finalAnimeList*/ ctx[10] || [];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, t.parentNode, outro_and_destroy_block, create_each_block$1, t, get_each_context$1);
    				check_outros();
    			}

    			if (/*$finalAnimeList*/ ctx[10]?.length && !/*$shownAllInList*/ ctx[13]) {
    				if (if_block) ; else {
    					if_block = create_if_block_4$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(1503:8) {#if $finalAnimeList?.length}",
    		ctx
    	});

    	return block;
    }

    // (1519:28) {#if anime.trailerID}
    function create_if_block_16$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "trailer display-none svelte-s0t2e6");
    			add_location(div, file$6, 1519, 32, 58182);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16$1.name,
    		type: "if",
    		source: "(1519:28) {#if anime.trailerID}",
    		ctx
    	});

    	return block;
    }

    // (1523:32) {#if anime.bannerImageUrl}
    function create_if_block_15$1(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "loading", "lazy");
    			attr_dev(img, "width", "640px");
    			attr_dev(img, "height", "360px");
    			if (!src_url_equal(img.src, img_src_value = /*anime*/ ctx[110].bannerImageUrl)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = (getTitle(/*anime*/ ctx[110]?.title) || "") + " Banner");
    			attr_dev(img, "class", "bannerImg fade-out svelte-s0t2e6");
    			attr_dev(img, "tabindex", "0");
    			add_location(img, file$6, 1524, 36, 58496);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(img, "load", /*load_handler*/ ctx[30], false, false, false, false),
    					listen_dev(img, "error", /*error_handler*/ ctx[31], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && !src_url_equal(img.src, img_src_value = /*anime*/ ctx[110].bannerImageUrl)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && img_alt_value !== (img_alt_value = (getTitle(/*anime*/ ctx[110]?.title) || "") + " Banner")) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15$1.name,
    		type: "if",
    		source: "(1523:32) {#if anime.bannerImageUrl}",
    		ctx
    	});

    	return block;
    }

    // (1566:28) {#if $listUpdateAvailable}
    function create_if_block_14$1(ctx) {
    	let div;
    	let i;
    	let t0;
    	let h3;

    	let t1_value = (/*windowWidth*/ ctx[5] >= 230
    	? "List Update"
    	: /*windowWidth*/ ctx[5] >= 205
    		? "Update"
    		: /*windowWidth*/ ctx[5] >= 180 ? "List" : "") + "";

    	let t1;
    	let div_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			t0 = space();
    			h3 = element("h3");
    			t1 = text(t1_value);
    			attr_dev(i, "class", "list-update-icon fa-solid fa-arrows-rotate svelte-s0t2e6");
    			add_location(i, file$6, 1575, 36, 61477);
    			attr_dev(h3, "class", "list-update-label svelte-s0t2e6");
    			add_location(h3, file$6, 1578, 36, 61649);
    			attr_dev(div, "class", "list-update-container svelte-s0t2e6");
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file$6, 1567, 32, 61011);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(div, t0);
    			append_dev(div, h3);
    			append_dev(h3, t1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*updateList*/ ctx[19], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_2*/ ctx[37], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[0] & /*windowWidth*/ 32) && t1_value !== (t1_value = (/*windowWidth*/ ctx[5] >= 230
    			? "List Update"
    			: /*windowWidth*/ ctx[5] >= 205
    				? "Update"
    				: /*windowWidth*/ ctx[5] >= 180 ? "List" : "") + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: -50, duration: 300 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: -50, duration: 300 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14$1.name,
    		type: "if",
    		source: "(1566:28) {#if $listUpdateAvailable}",
    		ctx
    	});

    	return block;
    }

    // (1688:36) {:else}
    function create_else_block_1$1(ctx) {
    	let h4;
    	let raw_value = (/*getFormattedAnimeFormat*/ ctx[24](/*anime*/ ctx[110]) || "NA") + "";
    	let h4_copy_value_value;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			attr_dev(h4, "class", "copy svelte-s0t2e6");
    			attr_dev(h4, "copy-value", h4_copy_value_value = htmlToString(/*getFormattedAnimeFormat*/ ctx[24](/*anime*/ ctx[110])) || "");
    			add_location(h4, file$6, 1688, 40, 68129);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			h4.innerHTML = raw_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && raw_value !== (raw_value = (/*getFormattedAnimeFormat*/ ctx[24](/*anime*/ ctx[110]) || "NA") + "")) h4.innerHTML = raw_value;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && h4_copy_value_value !== (h4_copy_value_value = htmlToString(/*getFormattedAnimeFormat*/ ctx[24](/*anime*/ ctx[110])) || "")) {
    				attr_dev(h4, "copy-value", h4_copy_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(1688:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1673:36) {#if anime?.nextAiringEpisode?.airingAt}
    function create_if_block_13$1(ctx) {
    	let previous_key = /*date*/ ctx[0]?.getSeconds?.() || 1;
    	let key_block_anchor;
    	let key_block = create_key_block(ctx);

    	const block = {
    		c: function create() {
    			key_block.c();
    			key_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			key_block.m(target, anchor);
    			insert_dev(target, key_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*date*/ 1 && safe_not_equal(previous_key, previous_key = /*date*/ ctx[0]?.getSeconds?.() || 1)) {
    				key_block.d(1);
    				key_block = create_key_block(ctx);
    				key_block.c();
    				key_block.m(key_block_anchor.parentNode, key_block_anchor);
    			} else {
    				key_block.p(ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(key_block_anchor);
    			key_block.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13$1.name,
    		type: "if",
    		source: "(1673:36) {#if anime?.nextAiringEpisode?.airingAt}",
    		ctx
    	});

    	return block;
    }

    // (1674:40) {#key date?.getSeconds?.() || 1}
    function create_key_block(ctx) {
    	let h4;
    	let raw_value = (/*getFormattedAnimeFormat*/ ctx[24](/*anime*/ ctx[110]) || "NA") + "";
    	let h4_copy_value_value;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			attr_dev(h4, "class", "copy svelte-s0t2e6");
    			attr_dev(h4, "copy-value", h4_copy_value_value = htmlToString(/*getFormattedAnimeFormat*/ ctx[24](/*anime*/ ctx[110])) || "");
    			add_location(h4, file$6, 1674, 44, 67302);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			h4.innerHTML = raw_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && raw_value !== (raw_value = (/*getFormattedAnimeFormat*/ ctx[24](/*anime*/ ctx[110]) || "NA") + "")) h4.innerHTML = raw_value;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && h4_copy_value_value !== (h4_copy_value_value = htmlToString(/*getFormattedAnimeFormat*/ ctx[24](/*anime*/ ctx[110])) || "")) {
    				attr_dev(h4, "copy-value", h4_copy_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block.name,
    		type: "key",
    		source: "(1674:40) {#key date?.getSeconds?.() || 1}",
    		ctx
    	});

    	return block;
    }

    // (1718:36) {:else}
    function create_else_block$1(ctx) {
    	let h4;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			h4.textContent = "NA";
    			attr_dev(h4, "class", "svelte-s0t2e6");
    			add_location(h4, file$6, 1718, 40, 69891);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(1718:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1700:36) {#if anime?.season || anime?.year}
    function create_if_block_12$1(ctx) {
    	let span;

    	let t_value = (`${/*anime*/ ctx[110]?.season || ""}${(/*anime*/ ctx[110]?.year)
	? " " + /*anime*/ ctx[110].year
	: ""}` || "NA") + "";

    	let t;
    	let span_copy_value_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			set_style(span, "text-align", "right");
    			attr_dev(span, "class", "copy svelte-s0t2e6");

    			attr_dev(span, "copy-value", span_copy_value_value = `${/*anime*/ ctx[110]?.season || ""}${(/*anime*/ ctx[110]?.year)
			? " " + /*anime*/ ctx[110].year
			: ""}` || "NA");

    			add_location(span, file$6, 1700, 40, 68830);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t_value !== (t_value = (`${/*anime*/ ctx[110]?.season || ""}${(/*anime*/ ctx[110]?.year)
			? " " + /*anime*/ ctx[110].year
			: ""}` || "NA") + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_copy_value_value !== (span_copy_value_value = `${/*anime*/ ctx[110]?.season || ""}${(/*anime*/ ctx[110]?.year)
			? " " + /*anime*/ ctx[110].year
			: ""}` || "NA")) {
    				attr_dev(span, "copy-value", span_copy_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12$1.name,
    		type: "if",
    		source: "(1700:36) {#if anime?.season || anime?.year}",
    		ctx
    	});

    	return block;
    }

    // (1751:44) {#if anime.userScore != null}
    function create_if_block_11$1(ctx) {
    	let t0_value = " · " + "";
    	let t0;
    	let t1;
    	let i;
    	let t2;
    	let t3_value = /*anime*/ ctx[110].userScore + "";
    	let t3;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			i = element("i");
    			t2 = space();
    			t3 = text(t3_value);
    			attr_dev(i, "class", "fa-regular fa-star svelte-s0t2e6");
    			add_location(i, file$6, 1752, 48, 71888);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, i, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, t3, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t3_value !== (t3_value = /*anime*/ ctx[110].userScore + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(i);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(t3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11$1.name,
    		type: "if",
    		source: "(1751:44) {#if anime.userScore != null}",
    		ctx
    	});

    	return block;
    }

    // (1767:36) {#if Object.entries(anime?.studios || {}).length}
    function create_if_block_10$1(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_3 = /*getStudios*/ ctx[22](Object.entries(/*anime*/ ctx[110].studios || {}), /*anime*/ ctx[110]?.favoriteContents?.studios);
    	validate_each_argument(each_value_3);
    	const get_key = ctx => /*studio*/ ctx[121];
    	validate_each_keys(ctx, each_value_3, get_each_context_3$1, get_key);

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		let child_ctx = get_each_context_3$1(ctx, each_value_3, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_3$1(key, child_ctx));
    	}

    	function mouseenter_handler(...args) {
    		return /*mouseenter_handler*/ ctx[38](/*anime*/ ctx[110], /*each_value*/ ctx[111], /*animeIdx*/ ctx[112], ...args);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Studios";
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "info-categ svelte-s0t2e6");
    			add_location(div0, file$6, 1768, 44, 72790);
    			attr_dev(div1, "class", "" + (null_to_empty("studio-popup info") + " svelte-s0t2e6"));
    			set_style(div1, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div1, file$6, 1771, 44, 72969);
    			attr_dev(div2, "class", "svelte-s0t2e6");
    			add_location(div2, file$6, 1767, 40, 72739);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div1, null);
    				}
    			}

    			if (!mounted) {
    				dispose = listen_dev(div1, "mouseenter", mouseenter_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*getStudios, $finalAnimeList*/ 4195328) {
    				each_value_3 = /*getStudios*/ ctx[22](Object.entries(/*anime*/ ctx[110].studios || {}), /*anime*/ ctx[110]?.favoriteContents?.studios);
    				validate_each_argument(each_value_3);
    				validate_each_keys(ctx, each_value_3, get_each_context_3$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_3, each_1_lookup, div1, destroy_block, create_each_block_3$1, null, get_each_context_3$1);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(div1, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10$1.name,
    		type: "if",
    		source: "(1767:36) {#if Object.entries(anime?.studios || {}).length}",
    		ctx
    	});

    	return block;
    }

    // (1787:48) {#each getStudios(Object.entries(anime.studios || {}), anime?.favoriteContents?.studios) as { studio, studioColor }
    function create_each_block_3$1(key_1, ctx) {
    	let span;
    	let a;
    	let t0_value = (/*studio*/ ctx[121].studioName || "N/A") + "";
    	let t0;
    	let a_class_value;
    	let a_rel_value;
    	let a_target_value;
    	let a_href_value;
    	let t1;
    	let span_copy_value_value;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			span = element("span");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();

    			attr_dev(a, "class", a_class_value = "" + (null_to_empty(/*studioColor*/ ctx[122]
    			? `${/*studioColor*/ ctx[122]}-color`
    			: "") + " svelte-s0t2e6"));

    			attr_dev(a, "rel", a_rel_value = /*studio*/ ctx[121].studioUrl
    			? "noopener noreferrer"
    			: "");

    			attr_dev(a, "target", a_target_value = /*studio*/ ctx[121].studioUrl ? "_blank" : "");
    			attr_dev(a, "href", a_href_value = /*studio*/ ctx[121].studioUrl || "javascript:void(0)");
    			add_location(a, file$6, 1792, 56, 74562);
    			attr_dev(span, "class", "" + (null_to_empty("copy") + " svelte-s0t2e6"));
    			attr_dev(span, "copy-value", span_copy_value_value = /*studio*/ ctx[121].studioName || "");
    			add_location(span, file$6, 1787, 52, 74217);
    			this.first = span;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, a);
    			append_dev(a, t0);
    			append_dev(span, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t0_value !== (t0_value = (/*studio*/ ctx[121].studioName || "N/A") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a_class_value !== (a_class_value = "" + (null_to_empty(/*studioColor*/ ctx[122]
    			? `${/*studioColor*/ ctx[122]}-color`
    			: "") + " svelte-s0t2e6"))) {
    				attr_dev(a, "class", a_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a_rel_value !== (a_rel_value = /*studio*/ ctx[121].studioUrl
    			? "noopener noreferrer"
    			: "")) {
    				attr_dev(a, "rel", a_rel_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a_target_value !== (a_target_value = /*studio*/ ctx[121].studioUrl ? "_blank" : "")) {
    				attr_dev(a, "target", a_target_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a_href_value !== (a_href_value = /*studio*/ ctx[121].studioUrl || "javascript:void(0)")) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_copy_value_value !== (span_copy_value_value = /*studio*/ ctx[121].studioName || "")) {
    				attr_dev(span, "copy-value", span_copy_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3$1.name,
    		type: "each",
    		source: "(1787:48) {#each getStudios(Object.entries(anime.studios || {}), anime?.favoriteContents?.studios) as { studio, studioColor }",
    		ctx
    	});

    	return block;
    }

    // (1813:36) {#if anime.genres.length}
    function create_if_block_9$1(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_2 = /*getGenres*/ ctx[23](/*anime*/ ctx[110].genres, /*anime*/ ctx[110]?.favoriteContents?.genres, /*anime*/ ctx[110].contentCaution);
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*genre*/ ctx[117];
    	validate_each_keys(ctx, each_value_2, get_each_context_2$1, get_key);

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2$1(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_2$1(key, child_ctx));
    	}

    	function mouseenter_handler_1(...args) {
    		return /*mouseenter_handler_1*/ ctx[39](/*anime*/ ctx[110], /*each_value*/ ctx[111], /*animeIdx*/ ctx[112], ...args);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Genres";
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "info-categ svelte-s0t2e6");
    			add_location(div0, file$6, 1814, 44, 76090);
    			attr_dev(div1, "class", "" + (null_to_empty("genres-popup info") + " svelte-s0t2e6"));
    			set_style(div1, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div1, file$6, 1815, 44, 76172);
    			attr_dev(div2, "class", "svelte-s0t2e6");
    			add_location(div2, file$6, 1813, 40, 76039);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div1, null);
    				}
    			}

    			if (!mounted) {
    				dispose = listen_dev(div1, "mouseenter", mouseenter_handler_1, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*getGenres, $finalAnimeList*/ 8389632) {
    				each_value_2 = /*getGenres*/ ctx[23](/*anime*/ ctx[110].genres, /*anime*/ ctx[110]?.favoriteContents?.genres, /*anime*/ ctx[110].contentCaution);
    				validate_each_argument(each_value_2);
    				validate_each_keys(ctx, each_value_2, get_each_context_2$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_2, each_1_lookup, div1, destroy_block, create_each_block_2$1, null, get_each_context_2$1);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(div1, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9$1.name,
    		type: "if",
    		source: "(1813:36) {#if anime.genres.length}",
    		ctx
    	});

    	return block;
    }

    // (1831:48) {#each getGenres(anime.genres, anime?.favoriteContents?.genres, anime.contentCaution) as { genre, genreColor }
    function create_each_block_2$1(key_1, ctx) {
    	let span;
    	let t0_value = (/*genre*/ ctx[117] || "N/A") + "";
    	let t0;
    	let t1;
    	let span_class_value;
    	let span_copy_value_value;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();

    			attr_dev(span, "class", span_class_value = "" + (null_to_empty("copy " + (/*genreColor*/ ctx[118]
    			? `${/*genreColor*/ ctx[118]}-color`
    			: "")) + " svelte-s0t2e6"));

    			attr_dev(span, "copy-value", span_copy_value_value = /*genre*/ ctx[117] || "");
    			add_location(span, file$6, 1831, 52, 77412);
    			this.first = span;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t0_value !== (t0_value = (/*genre*/ ctx[117] || "N/A") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_class_value !== (span_class_value = "" + (null_to_empty("copy " + (/*genreColor*/ ctx[118]
    			? `${/*genreColor*/ ctx[118]}-color`
    			: "")) + " svelte-s0t2e6"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_copy_value_value !== (span_copy_value_value = /*genre*/ ctx[117] || "")) {
    				attr_dev(span, "copy-value", span_copy_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(1831:48) {#each getGenres(anime.genres, anime?.favoriteContents?.genres, anime.contentCaution) as { genre, genreColor }",
    		ctx
    	});

    	return block;
    }

    // (1844:36) {#if anime?.tags?.length}
    function create_if_block_8$1(ctx) {
    	let div1;
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_1 = /*getTags*/ ctx[21](/*anime*/ ctx[110].tags, /*anime*/ ctx[110]?.favoriteContents?.tags, /*anime*/ ctx[110].contentCaution);
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*tag*/ ctx[113];
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
    	}

    	function mouseenter_handler_2(...args) {
    		return /*mouseenter_handler_2*/ ctx[40](/*anime*/ ctx[110], /*each_value*/ ctx[111], /*animeIdx*/ ctx[112], ...args);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "" + (null_to_empty("tags-info-content info") + " svelte-s0t2e6"));
    			set_style(div0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div0, file$6, 1845, 44, 78316);
    			attr_dev(div1, "class", "tag-info svelte-s0t2e6");
    			add_location(div1, file$6, 1844, 40, 78248);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div0, null);
    				}
    			}

    			if (!mounted) {
    				dispose = listen_dev(div0, "mouseenter", mouseenter_handler_2, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*getTags, $finalAnimeList*/ 2098176) {
    				each_value_1 = /*getTags*/ ctx[21](/*anime*/ ctx[110].tags, /*anime*/ ctx[110]?.favoriteContents?.tags, /*anime*/ ctx[110].contentCaution);
    				validate_each_argument(each_value_1);
    				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div0, destroy_block, create_each_block_1$1, null, get_each_context_1$1);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(div0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8$1.name,
    		type: "if",
    		source: "(1844:36) {#if anime?.tags?.length}",
    		ctx
    	});

    	return block;
    }

    // (1861:48) {#each getTags(anime.tags, anime?.favoriteContents?.tags, anime.contentCaution) as { tag, tagColor }
    function create_each_block_1$1(key_1, ctx) {
    	let span;
    	let html_tag;
    	let raw_value = (/*tag*/ ctx[113] || "N/A") + "";
    	let t;
    	let span_class_value;
    	let span_copy_value_value;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			span = element("span");
    			html_tag = new HtmlTag(false);
    			t = space();
    			html_tag.a = t;

    			attr_dev(span, "class", span_class_value = "" + (null_to_empty("copy " + (/*tagColor*/ ctx[114]
    			? `${/*tagColor*/ ctx[114]}-color`
    			: "")) + " svelte-s0t2e6"));

    			attr_dev(span, "copy-value", span_copy_value_value = htmlToString(/*tag*/ ctx[113]) || "");
    			add_location(span, file$6, 1861, 52, 79545);
    			this.first = span;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			html_tag.m(raw_value, span);
    			append_dev(span, t);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && raw_value !== (raw_value = (/*tag*/ ctx[113] || "N/A") + "")) html_tag.p(raw_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_class_value !== (span_class_value = "" + (null_to_empty("copy " + (/*tagColor*/ ctx[114]
    			? `${/*tagColor*/ ctx[114]}-color`
    			: "")) + " svelte-s0t2e6"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_copy_value_value !== (span_copy_value_value = htmlToString(/*tag*/ ctx[113]) || "")) {
    				attr_dev(span, "copy-value", span_copy_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(1861:48) {#each getTags(anime.tags, anime?.favoriteContents?.tags, anime.contentCaution) as { tag, tagColor }",
    		ctx
    	});

    	return block;
    }

    // (1878:36) {#if anime.coverImageUrl}
    function create_if_block_7$1(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let img_tabindex_value;
    	let img_class_value;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[43](/*anime*/ ctx[110]);
    	}

    	function keydown_handler_3(...args) {
    		return /*keydown_handler_3*/ ctx[44](/*anime*/ ctx[110], ...args);
    	}

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "loading", "lazy");
    			attr_dev(img, "width", "150px");
    			attr_dev(img, "height", "210px");
    			if (!src_url_equal(img.src, img_src_value = /*anime*/ ctx[110].coverImageUrl)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = (getTitle(/*anime*/ ctx[110]?.title) || "") + " Cover");
    			attr_dev(img, "tabindex", img_tabindex_value = /*anime*/ ctx[110].isSeenMore ? "0" : "-1");
    			attr_dev(img, "class", img_class_value = "" + (null_to_empty("coverImg display-none" + ((/*anime*/ ctx[110]?.description) ? "" : " nodesc")) + " svelte-s0t2e6"));
    			add_location(img, file$6, 1879, 40, 80709);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(img, "load", /*load_handler_1*/ ctx[41], false, false, false, false),
    					listen_dev(img, "error", /*error_handler_1*/ ctx[42], false, false, false, false),
    					listen_dev(img, "click", click_handler_1, false, false, false, false),
    					listen_dev(img, "keydown", keydown_handler_3, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && !src_url_equal(img.src, img_src_value = /*anime*/ ctx[110].coverImageUrl)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && img_alt_value !== (img_alt_value = (getTitle(/*anime*/ ctx[110]?.title) || "") + " Cover")) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && img_tabindex_value !== (img_tabindex_value = /*anime*/ ctx[110].isSeenMore ? "0" : "-1")) {
    				attr_dev(img, "tabindex", img_tabindex_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && img_class_value !== (img_class_value = "" + (null_to_empty("coverImg display-none" + ((/*anime*/ ctx[110]?.description) ? "" : " nodesc")) + " svelte-s0t2e6"))) {
    				attr_dev(img, "class", img_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7$1.name,
    		type: "if",
    		source: "(1878:36) {#if anime.coverImageUrl}",
    		ctx
    	});

    	return block;
    }

    // (1919:36) {#if anime.bannerImageUrl && anime.isSeenMore}
    function create_if_block_6$1(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[47](/*anime*/ ctx[110]);
    	}

    	function keydown_handler_4(...args) {
    		return /*keydown_handler_4*/ ctx[48](/*anime*/ ctx[110], ...args);
    	}

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "loading", "lazy");
    			attr_dev(img, "width", "440px");
    			attr_dev(img, "height", "210px");
    			if (!src_url_equal(img.src, img_src_value = /*anime*/ ctx[110].bannerImageUrl)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = (getTitle(/*anime*/ ctx[110]?.title) || "") + " Banner");
    			attr_dev(img, "tabindex", "0");
    			attr_dev(img, "class", "extra-bannerImg display-none svelte-s0t2e6");
    			add_location(img, file$6, 1920, 40, 83325);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(img, "load", /*load_handler_2*/ ctx[45], false, false, false, false),
    					listen_dev(img, "error", /*error_handler_2*/ ctx[46], false, false, false, false),
    					listen_dev(img, "click", click_handler_2, false, false, false, false),
    					listen_dev(img, "keydown", keydown_handler_4, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && !src_url_equal(img.src, img_src_value = /*anime*/ ctx[110].bannerImageUrl)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && img_alt_value !== (img_alt_value = (getTitle(/*anime*/ ctx[110]?.title) || "") + " Banner")) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6$1.name,
    		type: "if",
    		source: "(1919:36) {#if anime.bannerImageUrl && anime.isSeenMore}",
    		ctx
    	});

    	return block;
    }

    // (1955:36) {#if anime?.description}
    function create_if_block_5$1(ctx) {
    	let div1;
    	let h3;
    	let t1;
    	let div0;
    	let raw_value = editHTMLString(/*anime*/ ctx[110]?.description) + "";
    	let div0_copy_value_value;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[49](/*anime*/ ctx[110]);
    	}

    	function keydown_handler_5(...args) {
    		return /*keydown_handler_5*/ ctx[50](/*anime*/ ctx[110], ...args);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Description";
    			t1 = space();
    			div0 = element("div");
    			add_location(h3, file$6, 1973, 44, 86702);
    			attr_dev(div0, "class", "anime-description copy svelte-s0t2e6");
    			attr_dev(div0, "copy-value", div0_copy_value_value = htmlToString(/*anime*/ ctx[110]?.description) || "");
    			add_location(div0, file$6, 1974, 44, 86768);
    			attr_dev(div1, "class", "anime-description-wrapper svelte-s0t2e6");
    			add_location(div1, file$6, 1955, 40, 85511);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h3);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			div0.innerHTML = raw_value;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "click", click_handler_3, false, false, false, false),
    					listen_dev(div1, "keydown", keydown_handler_5, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && raw_value !== (raw_value = editHTMLString(/*anime*/ ctx[110]?.description) + "")) div0.innerHTML = raw_value;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && div0_copy_value_value !== (div0_copy_value_value = htmlToString(/*anime*/ ctx[110]?.description) || "")) {
    				attr_dev(div0, "copy-value", div0_copy_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(1955:36) {#if anime?.description}",
    		ctx
    	});

    	return block;
    }

    // (1504:12) {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}
    function create_each_block$1(key_1, ctx) {
    	let div15;
    	let div14;
    	let div2;
    	let div0;
    	let i0;
    	let t0;
    	let t1;
    	let div1;
    	let div2_class_value;
    	let each_value = /*each_value*/ ctx[111];
    	let animeIdx = /*animeIdx*/ ctx[112];
    	let t2;
    	let div4;
    	let div3;
    	let label;
    	let input;
    	let t3;
    	let span0;
    	let t4;
    	let h30;
    	let t6;
    	let t7;
    	let div13;
    	let div11;
    	let div6;
    	let a0;
    	let t8_value = (getTitle(/*anime*/ ctx[110]?.title) || "NA") + "";
    	let t8;
    	let a0_rel_value;
    	let a0_target_value;
    	let a0_href_value;
    	let a0_class_value;
    	let a0_copy_value_value;
    	let t9;
    	let div5;
    	let i1;
    	let t10;
    	let h31;
    	let b;

    	let t11_value = (/*anime*/ ctx[110].averageScore != null
    	? formatNumber(/*anime*/ ctx[110].averageScore * 0.1, 1)
    	: "NA") + "";

    	let t11;
    	let t12;

    	let t13_value = "/10 · " + (/*anime*/ ctx[110].popularity != null
    	? formatNumber(/*anime*/ ctx[110].popularity, 1)
    	: "NA") + "";

    	let t13;
    	let t14;
    	let t15_value = " · " + "";
    	let t15;
    	let html_tag;
    	let raw_value = getRecommendationRatingInfo(/*anime*/ ctx[110]) + "";
    	let h31_copy_value_value;
    	let t16;
    	let div7;
    	let t17;
    	let t18;
    	let div8;
    	let h40;
    	let a1;
    	let span1;
    	let t19_value = (/*anime*/ ctx[110].userStatus || "NA") + "";
    	let t19;
    	let span1_class_value;
    	let t20;
    	let a1_rel_value;
    	let a1_target_value;
    	let a1_href_value;
    	let h40_copy_value_value;
    	let t21;
    	let h41;
    	let t22_value = (/*anime*/ ctx[110].status || "NA") + "";
    	let t22;
    	let h41_copy_value_value;
    	let t23;
    	let div9;
    	let show_if = Object.entries(/*anime*/ ctx[110]?.studios || {}).length;
    	let t24;
    	let t25;
    	let t26;
    	let div10;
    	let t27;
    	let t28;
    	let div11_class_value;
    	let t29;
    	let div12;
    	let button0;
    	let t30_value = (/*getHiddenStatus*/ ctx[15](/*anime*/ ctx[110].id) || "N/A") + "";
    	let t30;
    	let t31;
    	let button1;
    	let t32_value = (/*anime*/ ctx[110].isSeenMore ? "Anilist" : "Expand") + "";
    	let t32;
    	let button1_class_value;
    	let t33;
    	let button2;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*anime*/ ctx[110].trailerID && create_if_block_16$1(ctx);
    	let if_block1 = /*anime*/ ctx[110].bannerImageUrl && create_if_block_15$1(ctx);
    	const assign_div2 = () => /*div2_binding*/ ctx[32](div2, each_value, animeIdx);
    	const unassign_div2 = () => /*div2_binding*/ ctx[32](null, each_value, animeIdx);

    	function click_handler() {
    		return /*click_handler*/ ctx[33](/*anime*/ ctx[110]);
    	}

    	function keydown_handler(...args) {
    		return /*keydown_handler*/ ctx[34](/*anime*/ ctx[110], ...args);
    	}

    	let if_block2 = /*$listUpdateAvailable*/ ctx[12] && create_if_block_14$1(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*anime*/ ctx[110]?.nextAiringEpisode?.airingAt) return create_if_block_13$1;
    		return create_else_block_1$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block3 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*anime*/ ctx[110]?.season || /*anime*/ ctx[110]?.year) return create_if_block_12$1;
    		return create_else_block$1;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block4 = current_block_type_1(ctx);
    	let if_block5 = /*anime*/ ctx[110].userScore != null && create_if_block_11$1(ctx);
    	let if_block6 = show_if && create_if_block_10$1(ctx);
    	let if_block7 = /*anime*/ ctx[110].genres.length && create_if_block_9$1(ctx);
    	let if_block8 = /*anime*/ ctx[110]?.tags?.length && create_if_block_8$1(ctx);
    	let if_block9 = /*anime*/ ctx[110].coverImageUrl && create_if_block_7$1(ctx);
    	let if_block10 = /*anime*/ ctx[110].bannerImageUrl && /*anime*/ ctx[110].isSeenMore && create_if_block_6$1(ctx);
    	let if_block11 = /*anime*/ ctx[110]?.description && create_if_block_5$1(ctx);

    	function keydown_handler_6(...args) {
    		return /*keydown_handler_6*/ ctx[51](/*anime*/ ctx[110], ...args);
    	}

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[52](/*anime*/ ctx[110], /*each_value*/ ctx[111], /*animeIdx*/ ctx[112]);
    	}

    	function keydown_handler_7(...args) {
    		return /*keydown_handler_7*/ ctx[53](/*anime*/ ctx[110], /*each_value*/ ctx[111], /*animeIdx*/ ctx[112], ...args);
    	}

    	function keydown_handler_8(...args) {
    		return /*keydown_handler_8*/ ctx[54](/*anime*/ ctx[110], ...args);
    	}

    	const assign_div15 = () => /*div15_binding*/ ctx[55](div15, each_value, animeIdx);
    	const unassign_div15 = () => /*div15_binding*/ ctx[55](null, each_value, animeIdx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div15 = element("div");
    			div14 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			i0 = element("i");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div1 = element("div");
    			if (if_block1) if_block1.c();
    			t2 = space();
    			div4 = element("div");
    			div3 = element("div");
    			label = element("label");
    			input = element("input");
    			t3 = space();
    			span0 = element("span");
    			t4 = space();
    			h30 = element("h3");
    			h30.textContent = "Auto Play";
    			t6 = space();
    			if (if_block2) if_block2.c();
    			t7 = space();
    			div13 = element("div");
    			div11 = element("div");
    			div6 = element("div");
    			a0 = element("a");
    			t8 = text(t8_value);
    			t9 = space();
    			div5 = element("div");
    			i1 = element("i");
    			t10 = space();
    			h31 = element("h3");
    			b = element("b");
    			t11 = text(t11_value);
    			t12 = space();
    			t13 = text(t13_value);
    			t14 = space();
    			t15 = text(t15_value);
    			html_tag = new HtmlTag(false);
    			t16 = space();
    			div7 = element("div");
    			if_block3.c();
    			t17 = space();
    			if_block4.c();
    			t18 = space();
    			div8 = element("div");
    			h40 = element("h4");
    			a1 = element("a");
    			span1 = element("span");
    			t19 = text(t19_value);
    			t20 = space();
    			if (if_block5) if_block5.c();
    			t21 = space();
    			h41 = element("h4");
    			t22 = text(t22_value);
    			t23 = space();
    			div9 = element("div");
    			if (if_block6) if_block6.c();
    			t24 = space();
    			if (if_block7) if_block7.c();
    			t25 = space();
    			if (if_block8) if_block8.c();
    			t26 = space();
    			div10 = element("div");
    			if (if_block9) if_block9.c();
    			t27 = space();
    			if (if_block10) if_block10.c();
    			t28 = space();
    			if (if_block11) if_block11.c();
    			t29 = space();
    			div12 = element("div");
    			button0 = element("button");
    			t30 = text(t30_value);
    			t31 = space();
    			button1 = element("button");
    			t32 = text(t32_value);
    			t33 = space();
    			button2 = element("button");
    			button2.textContent = "YouTube";
    			attr_dev(i0, "class", "fa-solid fa-k fa-fade svelte-s0t2e6");
    			add_location(i0, file$6, 1516, 32, 58026);
    			attr_dev(div0, "class", "popup-header-loading svelte-s0t2e6");
    			add_location(div0, file$6, 1515, 28, 57958);
    			attr_dev(div1, "class", "popup-img svelte-s0t2e6");
    			add_location(div1, file$6, 1521, 28, 58283);
    			attr_dev(div2, "class", div2_class_value = "" + (null_to_empty("popup-header " + (/*anime*/ ctx[110].trailerID ? "loader" : "")) + " svelte-s0t2e6"));
    			add_location(div2, file$6, 1506, 24, 57474);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "autoplayToggle svelte-s0t2e6");
    			add_location(input, file$6, 1549, 36, 59949);
    			attr_dev(span0, "class", "slider round svelte-s0t2e6");
    			attr_dev(span0, "tabindex", "0");
    			add_location(span0, file$6, 1555, 36, 60312);
    			attr_dev(label, "class", "switch svelte-s0t2e6");
    			add_location(label, file$6, 1548, 32, 59889);
    			attr_dev(h30, "class", "autoplay-label svelte-s0t2e6");
    			add_location(h30, file$6, 1563, 32, 60756);
    			attr_dev(div3, "class", "autoPlay-container svelte-s0t2e6");
    			add_location(div3, file$6, 1547, 28, 59823);
    			attr_dev(div4, "class", "popup-controls svelte-s0t2e6");
    			add_location(div4, file$6, 1546, 24, 59765);
    			attr_dev(a0, "rel", a0_rel_value = /*anime*/ ctx[110].animeUrl ? "noopener noreferrer" : "");
    			attr_dev(a0, "target", a0_target_value = /*anime*/ ctx[110].animeUrl ? "_blank" : "");
    			attr_dev(a0, "href", a0_href_value = /*anime*/ ctx[110].animeUrl || "javascript:void(0)");
    			attr_dev(a0, "class", a0_class_value = "" + (null_to_empty(getCautionColor(/*anime*/ ctx[110]) + "-color anime-title copy") + " svelte-s0t2e6"));
    			attr_dev(a0, "copy-value", a0_copy_value_value = getTitle(/*anime*/ ctx[110]?.title) || "");
    			set_style(a0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(a0, file$6, 1603, 36, 62988);
    			attr_dev(i1, "class", "fa-regular fa-star svelte-s0t2e6");
    			add_location(i1, file$6, 1626, 40, 64368);
    			attr_dev(b, "class", "svelte-s0t2e6");
    			add_location(b, file$6, 1644, 44, 65498);
    			html_tag.a = null;
    			attr_dev(h31, "class", "copy svelte-s0t2e6");

    			attr_dev(h31, "copy-value", h31_copy_value_value = (/*anime*/ ctx[110].averageScore != null
    			? formatNumber(/*anime*/ ctx[110].averageScore * 0.1, 1)
    			: "NA") + "/10 · " + (/*anime*/ ctx[110].popularity != null
    			? formatNumber(/*anime*/ ctx[110].popularity, 1)
    			: "NA"));

    			add_location(h31, file$6, 1627, 40, 64442);
    			attr_dev(div5, "class", "info-rating-wrapper svelte-s0t2e6");
    			set_style(div5, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div5, file$6, 1620, 36, 64032);
    			attr_dev(div6, "class", "anime-title-container svelte-s0t2e6");
    			set_style(div6, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div6, file$6, 1597, 32, 62674);
    			attr_dev(div7, "class", "info-format svelte-s0t2e6");
    			set_style(div7, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div7, file$6, 1666, 32, 66838);
    			attr_dev(span1, "class", span1_class_value = "" + (null_to_empty(/*getUserStatusColor*/ ctx[20](/*anime*/ ctx[110].userStatus) + "-color") + " svelte-s0t2e6"));
    			add_location(span1, file$6, 1743, 45, 71309);
    			attr_dev(a1, "rel", a1_rel_value = /*anime*/ ctx[110].animeUrl ? "noopener noreferrer" : "");
    			attr_dev(a1, "target", a1_target_value = /*anime*/ ctx[110].animeUrl ? "_blank" : "");
    			attr_dev(a1, "href", a1_href_value = /*anime*/ ctx[110].animeUrl || "javascript:void(0)");
    			attr_dev(a1, "class", "svelte-s0t2e6");
    			add_location(a1, file$6, 1734, 40, 70744);
    			attr_dev(h40, "class", "copy svelte-s0t2e6");

    			attr_dev(h40, "copy-value", h40_copy_value_value = (/*anime*/ ctx[110].userStatus || "NA") + (/*anime*/ ctx[110].userScore != null
    			? " · " + /*anime*/ ctx[110].userScore
    			: ""));

    			add_location(h40, file$6, 1727, 36, 70323);
    			set_style(h41, "text-align", "right");
    			attr_dev(h41, "class", "copy svelte-s0t2e6");
    			attr_dev(h41, "copy-value", h41_copy_value_value = /*anime*/ ctx[110].status || "");
    			add_location(h41, file$6, 1757, 36, 72165);
    			attr_dev(div8, "class", "info-status svelte-s0t2e6");
    			set_style(div8, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div8, file$6, 1721, 32, 70019);
    			attr_dev(div9, "class", "info-contents svelte-s0t2e6");
    			add_location(div9, file$6, 1765, 32, 72583);
    			attr_dev(div10, "class", "info-profile svelte-s0t2e6");
    			add_location(div10, file$6, 1876, 32, 80482);
    			attr_dev(div11, "class", div11_class_value = "" + (null_to_empty("popup-info" + (/*anime*/ ctx[110].isSeenMore ? " seenmore" : "")) + " svelte-s0t2e6"));
    			set_style(div11, "--windowWidth", /*windowWidth*/ ctx[5] + "px");
    			set_style(div11, "--windowHeight", /*windowHeight*/ ctx[6] + "px");
    			add_location(div11, file$6, 1591, 28, 62324);
    			attr_dev(button0, "class", "hideshowbtn svelte-s0t2e6");
    			set_style(button0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(button0, file$6, 1989, 32, 87603);
    			attr_dev(button1, "class", button1_class_value = "" + (null_to_empty(/*anime*/ ctx[110].isSeenMore ? "openanilist" : "expand") + " svelte-s0t2e6"));
    			set_style(button1, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(button1, file$6, 2001, 32, 88288);
    			attr_dev(button2, "class", "morevideos svelte-s0t2e6");
    			set_style(button2, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(button2, file$6, 2028, 32, 89805);
    			attr_dev(div12, "class", "footer svelte-s0t2e6");
    			add_location(div12, file$6, 1988, 28, 87549);
    			attr_dev(div13, "class", "popup-body svelte-s0t2e6");
    			add_location(div13, file$6, 1590, 24, 62270);
    			attr_dev(div14, "class", "popup-main svelte-s0t2e6");
    			add_location(div14, file$6, 1505, 20, 57424);
    			attr_dev(div15, "class", "popup-content svelte-s0t2e6");
    			add_location(div15, file$6, 1504, 16, 57344);
    			this.first = div15;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div15, anchor);
    			append_dev(div15, div14);
    			append_dev(div14, div2);
    			append_dev(div2, div0);
    			append_dev(div0, i0);
    			append_dev(div2, t0);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			if (if_block1) if_block1.m(div1, null);
    			assign_div2();
    			append_dev(div14, t2);
    			append_dev(div14, div4);
    			append_dev(div4, div3);
    			append_dev(div3, label);
    			append_dev(label, input);
    			input.checked = /*$autoPlay*/ ctx[11];
    			append_dev(label, t3);
    			append_dev(label, span0);
    			append_dev(div3, t4);
    			append_dev(div3, h30);
    			append_dev(div4, t6);
    			if (if_block2) if_block2.m(div4, null);
    			append_dev(div14, t7);
    			append_dev(div14, div13);
    			append_dev(div13, div11);
    			append_dev(div11, div6);
    			append_dev(div6, a0);
    			append_dev(a0, t8);
    			append_dev(div6, t9);
    			append_dev(div6, div5);
    			append_dev(div5, i1);
    			append_dev(div5, t10);
    			append_dev(div5, h31);
    			append_dev(h31, b);
    			append_dev(b, t11);
    			append_dev(h31, t12);
    			append_dev(h31, t13);
    			append_dev(h31, t14);
    			append_dev(h31, t15);
    			html_tag.m(raw_value, h31);
    			append_dev(div11, t16);
    			append_dev(div11, div7);
    			if_block3.m(div7, null);
    			append_dev(div7, t17);
    			if_block4.m(div7, null);
    			append_dev(div11, t18);
    			append_dev(div11, div8);
    			append_dev(div8, h40);
    			append_dev(h40, a1);
    			append_dev(a1, span1);
    			append_dev(span1, t19);
    			append_dev(a1, t20);
    			if (if_block5) if_block5.m(a1, null);
    			append_dev(div8, t21);
    			append_dev(div8, h41);
    			append_dev(h41, t22);
    			append_dev(div11, t23);
    			append_dev(div11, div9);
    			if (if_block6) if_block6.m(div9, null);
    			append_dev(div9, t24);
    			if (if_block7) if_block7.m(div9, null);
    			append_dev(div9, t25);
    			if (if_block8) if_block8.m(div9, null);
    			append_dev(div11, t26);
    			append_dev(div11, div10);
    			if (if_block9) if_block9.m(div10, null);
    			append_dev(div10, t27);
    			if (if_block10) if_block10.m(div10, null);
    			append_dev(div10, t28);
    			if (if_block11) if_block11.m(div10, null);
    			append_dev(div13, t29);
    			append_dev(div13, div12);
    			append_dev(div12, button0);
    			append_dev(button0, t30);
    			append_dev(div12, t31);
    			append_dev(div12, button1);
    			append_dev(button1, t32);
    			append_dev(div12, t33);
    			append_dev(div12, button2);
    			assign_div15();
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div2, "click", click_handler, false, false, false, false),
    					listen_dev(div2, "keydown", keydown_handler, false, false, false, false),
    					listen_dev(input, "change", /*input_change_handler*/ ctx[35]),
    					listen_dev(span0, "keydown", /*keydown_handler_1*/ ctx[36], false, false, false, false),
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*handleHideShow*/ ctx[16](/*anime*/ ctx[110].id))) /*handleHideShow*/ ctx[16](/*anime*/ ctx[110].id).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(button0, "keydown", keydown_handler_6, false, false, false, false),
    					listen_dev(button1, "click", click_handler_4, false, false, false, false),
    					listen_dev(button1, "keydown", keydown_handler_7, false, false, false, false),
    					listen_dev(
    						button2,
    						"click",
    						function () {
    							if (is_function(/*handleMoreVideos*/ ctx[18](/*anime*/ ctx[110].title))) /*handleMoreVideos*/ ctx[18](/*anime*/ ctx[110].title).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(button2, "keydown", keydown_handler_8, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*anime*/ ctx[110].trailerID) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_16$1(ctx);
    					if_block0.c();
    					if_block0.m(div2, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*anime*/ ctx[110].bannerImageUrl) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_15$1(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && div2_class_value !== (div2_class_value = "" + (null_to_empty("popup-header " + (/*anime*/ ctx[110].trailerID ? "loader" : "")) + " svelte-s0t2e6"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			if (each_value !== /*each_value*/ ctx[111] || animeIdx !== /*animeIdx*/ ctx[112]) {
    				unassign_div2();
    				each_value = /*each_value*/ ctx[111];
    				animeIdx = /*animeIdx*/ ctx[112];
    				assign_div2();
    			}

    			if (dirty[0] & /*$autoPlay*/ 2048) {
    				input.checked = /*$autoPlay*/ ctx[11];
    			}

    			if (/*$listUpdateAvailable*/ ctx[12]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*$listUpdateAvailable*/ 4096) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_14$1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div4, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty[0] & /*$finalAnimeList*/ 1024) && t8_value !== (t8_value = (getTitle(/*anime*/ ctx[110]?.title) || "NA") + "")) set_data_dev(t8, t8_value);

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && a0_rel_value !== (a0_rel_value = /*anime*/ ctx[110].animeUrl ? "noopener noreferrer" : "")) {
    				attr_dev(a0, "rel", a0_rel_value);
    			}

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && a0_target_value !== (a0_target_value = /*anime*/ ctx[110].animeUrl ? "_blank" : "")) {
    				attr_dev(a0, "target", a0_target_value);
    			}

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && a0_href_value !== (a0_href_value = /*anime*/ ctx[110].animeUrl || "javascript:void(0)")) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && a0_class_value !== (a0_class_value = "" + (null_to_empty(getCautionColor(/*anime*/ ctx[110]) + "-color anime-title copy") + " svelte-s0t2e6"))) {
    				attr_dev(a0, "class", a0_class_value);
    			}

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && a0_copy_value_value !== (a0_copy_value_value = getTitle(/*anime*/ ctx[110]?.title) || "")) {
    				attr_dev(a0, "copy-value", a0_copy_value_value);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(a0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if ((!current || dirty[0] & /*$finalAnimeList*/ 1024) && t11_value !== (t11_value = (/*anime*/ ctx[110].averageScore != null
    			? formatNumber(/*anime*/ ctx[110].averageScore * 0.1, 1)
    			: "NA") + "")) set_data_dev(t11, t11_value);

    			if ((!current || dirty[0] & /*$finalAnimeList*/ 1024) && t13_value !== (t13_value = "/10 · " + (/*anime*/ ctx[110].popularity != null
    			? formatNumber(/*anime*/ ctx[110].popularity, 1)
    			: "NA") + "")) set_data_dev(t13, t13_value);

    			if ((!current || dirty[0] & /*$finalAnimeList*/ 1024) && raw_value !== (raw_value = getRecommendationRatingInfo(/*anime*/ ctx[110]) + "")) html_tag.p(raw_value);

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && h31_copy_value_value !== (h31_copy_value_value = (/*anime*/ ctx[110].averageScore != null
    			? formatNumber(/*anime*/ ctx[110].averageScore * 0.1, 1)
    			: "NA") + "/10 · " + (/*anime*/ ctx[110].popularity != null
    			? formatNumber(/*anime*/ ctx[110].popularity, 1)
    			: "NA"))) {
    				attr_dev(h31, "copy-value", h31_copy_value_value);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(div5, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(div6, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block3) {
    				if_block3.p(ctx, dirty);
    			} else {
    				if_block3.d(1);
    				if_block3 = current_block_type(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(div7, t17);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block4) {
    				if_block4.p(ctx, dirty);
    			} else {
    				if_block4.d(1);
    				if_block4 = current_block_type_1(ctx);

    				if (if_block4) {
    					if_block4.c();
    					if_block4.m(div7, null);
    				}
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(div7, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if ((!current || dirty[0] & /*$finalAnimeList*/ 1024) && t19_value !== (t19_value = (/*anime*/ ctx[110].userStatus || "NA") + "")) set_data_dev(t19, t19_value);

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && span1_class_value !== (span1_class_value = "" + (null_to_empty(/*getUserStatusColor*/ ctx[20](/*anime*/ ctx[110].userStatus) + "-color") + " svelte-s0t2e6"))) {
    				attr_dev(span1, "class", span1_class_value);
    			}

    			if (/*anime*/ ctx[110].userScore != null) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_11$1(ctx);
    					if_block5.c();
    					if_block5.m(a1, null);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && a1_rel_value !== (a1_rel_value = /*anime*/ ctx[110].animeUrl ? "noopener noreferrer" : "")) {
    				attr_dev(a1, "rel", a1_rel_value);
    			}

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && a1_target_value !== (a1_target_value = /*anime*/ ctx[110].animeUrl ? "_blank" : "")) {
    				attr_dev(a1, "target", a1_target_value);
    			}

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && a1_href_value !== (a1_href_value = /*anime*/ ctx[110].animeUrl || "javascript:void(0)")) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && h40_copy_value_value !== (h40_copy_value_value = (/*anime*/ ctx[110].userStatus || "NA") + (/*anime*/ ctx[110].userScore != null
    			? " · " + /*anime*/ ctx[110].userScore
    			: ""))) {
    				attr_dev(h40, "copy-value", h40_copy_value_value);
    			}

    			if ((!current || dirty[0] & /*$finalAnimeList*/ 1024) && t22_value !== (t22_value = (/*anime*/ ctx[110].status || "NA") + "")) set_data_dev(t22, t22_value);

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && h41_copy_value_value !== (h41_copy_value_value = /*anime*/ ctx[110].status || "")) {
    				attr_dev(h41, "copy-value", h41_copy_value_value);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(div8, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024) show_if = Object.entries(/*anime*/ ctx[110]?.studios || {}).length;

    			if (show_if) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    				} else {
    					if_block6 = create_if_block_10$1(ctx);
    					if_block6.c();
    					if_block6.m(div9, t24);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (/*anime*/ ctx[110].genres.length) {
    				if (if_block7) {
    					if_block7.p(ctx, dirty);
    				} else {
    					if_block7 = create_if_block_9$1(ctx);
    					if_block7.c();
    					if_block7.m(div9, t25);
    				}
    			} else if (if_block7) {
    				if_block7.d(1);
    				if_block7 = null;
    			}

    			if (/*anime*/ ctx[110]?.tags?.length) {
    				if (if_block8) {
    					if_block8.p(ctx, dirty);
    				} else {
    					if_block8 = create_if_block_8$1(ctx);
    					if_block8.c();
    					if_block8.m(div9, null);
    				}
    			} else if (if_block8) {
    				if_block8.d(1);
    				if_block8 = null;
    			}

    			if (/*anime*/ ctx[110].coverImageUrl) {
    				if (if_block9) {
    					if_block9.p(ctx, dirty);
    				} else {
    					if_block9 = create_if_block_7$1(ctx);
    					if_block9.c();
    					if_block9.m(div10, t27);
    				}
    			} else if (if_block9) {
    				if_block9.d(1);
    				if_block9 = null;
    			}

    			if (/*anime*/ ctx[110].bannerImageUrl && /*anime*/ ctx[110].isSeenMore) {
    				if (if_block10) {
    					if_block10.p(ctx, dirty);
    				} else {
    					if_block10 = create_if_block_6$1(ctx);
    					if_block10.c();
    					if_block10.m(div10, t28);
    				}
    			} else if (if_block10) {
    				if_block10.d(1);
    				if_block10 = null;
    			}

    			if (/*anime*/ ctx[110]?.description) {
    				if (if_block11) {
    					if_block11.p(ctx, dirty);
    				} else {
    					if_block11 = create_if_block_5$1(ctx);
    					if_block11.c();
    					if_block11.m(div10, null);
    				}
    			} else if (if_block11) {
    				if_block11.d(1);
    				if_block11 = null;
    			}

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && div11_class_value !== (div11_class_value = "" + (null_to_empty("popup-info" + (/*anime*/ ctx[110].isSeenMore ? " seenmore" : "")) + " svelte-s0t2e6"))) {
    				attr_dev(div11, "class", div11_class_value);
    			}

    			if (dirty[0] & /*windowWidth*/ 32) {
    				set_style(div11, "--windowWidth", /*windowWidth*/ ctx[5] + "px");
    			}

    			if (dirty[0] & /*windowHeight*/ 64) {
    				set_style(div11, "--windowHeight", /*windowHeight*/ ctx[6] + "px");
    			}

    			if ((!current || dirty[0] & /*$finalAnimeList*/ 1024) && t30_value !== (t30_value = (/*getHiddenStatus*/ ctx[15](/*anime*/ ctx[110].id) || "N/A") + "")) set_data_dev(t30, t30_value);

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(button0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if ((!current || dirty[0] & /*$finalAnimeList*/ 1024) && t32_value !== (t32_value = (/*anime*/ ctx[110].isSeenMore ? "Anilist" : "Expand") + "")) set_data_dev(t32, t32_value);

    			if (!current || dirty[0] & /*$finalAnimeList*/ 1024 && button1_class_value !== (button1_class_value = "" + (null_to_empty(/*anime*/ ctx[110].isSeenMore ? "openanilist" : "expand") + " svelte-s0t2e6"))) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(button1, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(button2, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (each_value !== /*each_value*/ ctx[111] || animeIdx !== /*animeIdx*/ ctx[112]) {
    				unassign_div15();
    				each_value = /*each_value*/ ctx[111];
    				animeIdx = /*animeIdx*/ ctx[112];
    				assign_div15();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div15);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			unassign_div2();
    			if (if_block2) if_block2.d();
    			if_block3.d();
    			if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			if (if_block9) if_block9.d();
    			if (if_block10) if_block10.d();
    			if (if_block11) if_block11.d();
    			unassign_div15();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(1504:12) {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}",
    		ctx
    	});

    	return block;
    }

    // (2045:12) {#if $finalAnimeList?.length && !$shownAllInList}
    function create_if_block_4$2(ctx) {
    	let div;
    	let i;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "popup-content-loading-icon fa-solid fa-k fa-fade svelte-s0t2e6");
    			add_location(i, file$6, 2046, 20, 90674);
    			attr_dev(div, "class", "popup-content-loading svelte-s0t2e6");
    			add_location(div, file$6, 2045, 16, 90617);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(2045:12) {#if $finalAnimeList?.length && !$shownAllInList}",
    		ctx
    	});

    	return block;
    }

    // (2055:0) {#if $popupVisible && $popupIsGoingBack}
    function create_if_block_2$2(ctx) {
    	let div1;
    	let div0;
    	let i;
    	let div0_class_value;
    	let div1_outro;
    	let current;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			i = element("i");
    			attr_dev(i, "class", "fa-solid fa-arrow-left svelte-s0t2e6");
    			add_location(i, file$6, 2064, 12, 91266);
    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty("go-back-grid" + (/*goBackPercent*/ ctx[7] >= 100 ? " willGoBack" : "")) + " svelte-s0t2e6"));
    			add_location(div0, file$6, 2061, 8, 91155);
    			attr_dev(div1, "class", "go-back-grid-highlight svelte-s0t2e6");
    			set_style(div1, "--scale", Math.max(1, (/*goBackPercent*/ ctx[7] ?? 1) * 0.01 * 2));
    			set_style(div1, "--position", "-" + (100 - (/*goBackPercent*/ ctx[7] ?? 0)) + "%");
    			add_location(div1, file$6, 2055, 4, 90908);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, i);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*goBackPercent*/ 128 && div0_class_value !== (div0_class_value = "" + (null_to_empty("go-back-grid" + (/*goBackPercent*/ ctx[7] >= 100 ? " willGoBack" : "")) + " svelte-s0t2e6"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty[0] & /*goBackPercent*/ 128) {
    				set_style(div1, "--scale", Math.max(1, (/*goBackPercent*/ ctx[7] ?? 1) * 0.01 * 2));
    			}

    			if (dirty[0] & /*goBackPercent*/ 128) {
    				set_style(div1, "--position", "-" + (100 - (/*goBackPercent*/ ctx[7] ?? 0)) + "%");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (div1_outro) div1_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			div1_outro = create_out_transition(div1, fly, { x: -176, duration: 1000 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching && div1_outro) div1_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(2055:0) {#if $popupVisible && $popupIsGoingBack}",
    		ctx
    	});

    	return block;
    }

    // (2069:0) {#if fullImagePopup}
    function create_if_block_1$4(ctx) {
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let img_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			attr_dev(img, "class", "fullPopupImage svelte-s0t2e6");
    			attr_dev(img, "loading", "lazy");
    			if (!src_url_equal(img.src, img_src_value = /*fullImagePopup*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Full View");
    			add_location(img, file$6, 2076, 12, 91635);
    			attr_dev(div0, "class", "fullPopup svelte-s0t2e6");
    			add_location(div0, file$6, 2075, 8, 91598);
    			attr_dev(div1, "class", "fullPopupWrapper svelte-s0t2e6");
    			add_location(div1, file$6, 2069, 4, 91365);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(img, "error", /*error_handler_3*/ ctx[59], false, false, false, false),
    					listen_dev(div1, "click", /*click_handler_5*/ ctx[60], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_10*/ ctx[61], false, false, false, false),
    					listen_dev(div1, "pointerup", /*pointerup_handler*/ ctx[62], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*fullImagePopup*/ 8 && !src_url_equal(img.src, img_src_value = /*fullImagePopup*/ ctx[3])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!img_transition) img_transition = create_bidirectional_transition(img, fly, { y: 20, duration: 300 }, true);
    				img_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!img_transition) img_transition = create_bidirectional_transition(img, fly, { y: 20, duration: 300 }, false);
    			img_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching && img_transition) img_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(2069:0) {#if fullImagePopup}",
    		ctx
    	});

    	return block;
    }

    // (2090:0) {#if fullDescriptionPopup}
    function create_if_block$5(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let div0_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "fullPopupDescription svelte-s0t2e6");
    			add_location(div0, file$6, 2098, 16, 92386);
    			attr_dev(div1, "class", "fullPopupDescriptionWrapper svelte-s0t2e6");
    			add_location(div1, file$6, 2097, 12, 92327);
    			attr_dev(div2, "class", "fullPopup svelte-s0t2e6");
    			add_location(div2, file$6, 2096, 8, 92290);
    			attr_dev(div3, "class", "fullPopupWrapper svelte-s0t2e6");
    			add_location(div3, file$6, 2090, 4, 92039);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			div0.innerHTML = /*fullDescriptionPopup*/ ctx[4];
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div3, "click", /*click_handler_6*/ ctx[63], false, false, false, false),
    					listen_dev(div3, "keydown", /*keydown_handler_11*/ ctx[64], false, false, false, false),
    					listen_dev(div3, "pointerup", /*pointerup_handler_1*/ ctx[65], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*fullDescriptionPopup*/ 16) div0.innerHTML = /*fullDescriptionPopup*/ ctx[4];		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fly, { y: 20, duration: 300 }, true);
    				div0_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fly, { y: 20, duration: 300 }, false);
    			div0_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (detaching && div0_transition) div0_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(2090:0) {#if fullDescriptionPopup}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let if_block3_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$finalAnimeList*/ ctx[10]?.length && create_if_block_3$2(ctx);
    	let if_block1 = /*$popupVisible*/ ctx[9] && /*$popupIsGoingBack*/ ctx[8] && create_if_block_2$2(ctx);
    	let if_block2 = /*fullImagePopup*/ ctx[3] && create_if_block_1$4(ctx);
    	let if_block3 = /*fullDescriptionPopup*/ ctx[4] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			if_block3_anchor = empty();
    			attr_dev(div0, "id", "popup-container");
    			attr_dev(div0, "class", "popup-container hide svelte-s0t2e6");
    			set_style(div0, "--translateX", /*windowWidth*/ ctx[5] + "px");
    			set_style(div0, "--translateY", /*windowHeight*/ ctx[6] + "px");
    			add_location(div0, file$6, 1490, 4, 56746);
    			attr_dev(div1, "id", "popup-wrapper");
    			attr_dev(div1, "class", "popup-wrapper svelte-s0t2e6");
    			add_location(div1, file$6, 1483, 0, 56543);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			if (if_block0) if_block0.m(div0, null);
    			/*div0_binding*/ ctx[56](div0);
    			/*div1_binding*/ ctx[58](div1);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert_dev(target, if_block3_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "touchstart", /*handlePopupContainerDown*/ ctx[26], { passive: true }, false, false, false),
    					listen_dev(div0, "touchmove", /*handlePopupContainerMove*/ ctx[27], { passive: true }, false, false, false),
    					listen_dev(div0, "touchend", /*handlePopupContainerUp*/ ctx[28], { passive: true }, false, false, false),
    					listen_dev(div0, "touchcancel", /*handlePopupContainerCancel*/ ctx[29], { passive: true }, false, false, false),
    					listen_dev(div0, "scroll", /*itemScroll*/ ctx[25], false, false, false, false),
    					listen_dev(div1, "click", /*handlePopupVisibility*/ ctx[14], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_9*/ ctx[57], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*$finalAnimeList*/ ctx[10]?.length) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*$finalAnimeList*/ 1024) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3$2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*windowWidth*/ 32) {
    				set_style(div0, "--translateX", /*windowWidth*/ ctx[5] + "px");
    			}

    			if (dirty[0] & /*windowHeight*/ 64) {
    				set_style(div0, "--translateY", /*windowHeight*/ ctx[6] + "px");
    			}

    			if (/*$popupVisible*/ ctx[9] && /*$popupIsGoingBack*/ ctx[8]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$popupVisible, $popupIsGoingBack*/ 768) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*fullImagePopup*/ ctx[3]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*fullImagePopup*/ 8) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1$4(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(t2.parentNode, t2);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*fullDescriptionPopup*/ ctx[4]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty[0] & /*fullDescriptionPopup*/ 16) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block$5(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(if_block3_anchor.parentNode, if_block3_anchor);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			/*div0_binding*/ ctx[56](null);
    			/*div1_binding*/ ctx[58](null);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach_dev(if_block3_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function openInAnilist(animeUrl) {
    	if (typeof animeUrl !== "string" || animeUrl === "") return;
    	window.open(animeUrl, "_blank");
    }

    function getCautionColor({ contentCaution, meanScoreAll, meanScoreAbove, score }) {
    	if (contentCaution?.caution?.length) {
    		// Caution
    		return "red";
    	} else if (contentCaution?.semiCaution?.length) {
    		// Semi Caution
    		return "teal";
    	} else if (score < meanScoreAll) {
    		// Very Low Score
    		return "purple";
    	} else if (score < meanScoreAbove) {
    		// Low Score
    		return "orange";
    	} else {
    		return "green";
    	}
    }

    function getRecommendationRatingInfo({ score, meanScoreAll, meanScoreAbove }) {
    	if (score < meanScoreAll) {
    		// Very Low Score
    		return `<i class="purple-color fa-solid fa-k"/>`;
    	} else if (score < meanScoreAbove) {
    		// Low Score
    		return `<i class="purple-color fa-solid fa-k"/>`;
    	} else {
    		return `<i class="green-color fa-solid fa-k"/>`;
    	}
    }

    function loadYouTubeAPI() {
    	return new Promise(resolve => {
    			let existingScript = document.getElementById("www-widgetapi-script");

    			if (existingScript) {
    				existingScript.parentElement.removeChild(existingScript);
    			}

    			let tag = document.createElement("script");
    			tag.src = "https://www.youtube.com/iframe_api?v=16";

    			tag.onerror = () => {
    				resolve();
    			};

    			tag.onload = () => {
    				window?.onYouTubeIframeAPIReady?.();
    				resolve();
    			};

    			let firstScriptTag = document.getElementsByTagName("script")[0];
    			firstScriptTag.parentElement.insertBefore(tag, firstScriptTag);
    		});
    }

    function htmlToString(s) {
    	let span = document.createElement("span");
    	span.innerHTML = s;
    	return span.textContent || span.innerText;
    }

    function editHTMLString(s) {
    	let span = document.createElement("span");
    	span.innerHTML = s;
    	let links = span.querySelectorAll("a");

    	Array.from(links).forEach(linkEl => {
    		linkEl?.setAttribute("rel", "noopener noreferrer");
    		linkEl?.setAttribute("target", "_blank");
    	});

    	return span.innerHTML;
    }

    function getTitle(title) {
    	return title?.english || title?.userPreferred || title?.romaji || title?.native || "";
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $popupIsGoingBack;
    	let $popupVisible;
    	let $dataStatus;
    	let $android;
    	let $ytPlayers;
    	let $updateRecommendationList;
    	let $finalAnimeList;
    	let $initData;
    	let $autoPlay;
    	let $inApp;
    	let $numberOfNextLoadedGrid;
    	let $hiddenEntries;
    	let $searchedAnimeKeyword;
    	let $animeLoaderWorker;
    	let $listUpdateAvailable;
    	let $confirmPromise;
    	let $animeObserver;
    	let $openedAnimePopupIdx;
    	let $checkAnimeLoaderStatus;
    	let $shownAllInList;
    	validate_store(popupIsGoingBack, 'popupIsGoingBack');
    	component_subscribe($$self, popupIsGoingBack, $$value => $$invalidate(8, $popupIsGoingBack = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(9, $popupVisible = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(87, $dataStatus = $$value));
    	validate_store(android, 'android');
    	component_subscribe($$self, android, $$value => $$invalidate(88, $android = $$value));
    	validate_store(ytPlayers, 'ytPlayers');
    	component_subscribe($$self, ytPlayers, $$value => $$invalidate(89, $ytPlayers = $$value));
    	validate_store(updateRecommendationList, 'updateRecommendationList');
    	component_subscribe($$self, updateRecommendationList, $$value => $$invalidate(90, $updateRecommendationList = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(10, $finalAnimeList = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(91, $initData = $$value));
    	validate_store(autoPlay, 'autoPlay');
    	component_subscribe($$self, autoPlay, $$value => $$invalidate(11, $autoPlay = $$value));
    	validate_store(inApp, 'inApp');
    	component_subscribe($$self, inApp, $$value => $$invalidate(92, $inApp = $$value));
    	validate_store(numberOfNextLoadedGrid, 'numberOfNextLoadedGrid');
    	component_subscribe($$self, numberOfNextLoadedGrid, $$value => $$invalidate(93, $numberOfNextLoadedGrid = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(94, $hiddenEntries = $$value));
    	validate_store(searchedAnimeKeyword, 'searchedAnimeKeyword');
    	component_subscribe($$self, searchedAnimeKeyword, $$value => $$invalidate(95, $searchedAnimeKeyword = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(96, $animeLoaderWorker = $$value));
    	validate_store(listUpdateAvailable, 'listUpdateAvailable');
    	component_subscribe($$self, listUpdateAvailable, $$value => $$invalidate(12, $listUpdateAvailable = $$value));
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(97, $confirmPromise = $$value));
    	validate_store(animeObserver, 'animeObserver');
    	component_subscribe($$self, animeObserver, $$value => $$invalidate(98, $animeObserver = $$value));
    	validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
    	component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(99, $openedAnimePopupIdx = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(100, $checkAnimeLoaderStatus = $$value));
    	validate_store(shownAllInList, 'shownAllInList');
    	component_subscribe($$self, shownAllInList, $$value => $$invalidate(13, $shownAllInList = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AnimePopup', slots, []);
    	let isOnline = window.navigator.onLine;
    	let date = new Date();
    	let savedYtVolume = $android ? 100 : 50;

    	(async () => {
    		savedYtVolume = await retrieveJSON("savedYtVolume") || savedYtVolume;
    	})();

    	let animeGridParentEl,
    		mostVisiblePopupHeader,
    		currentHeaderIdx,
    		currentYtPlayer,
    		mainHome,
    		popupWrapper,
    		popupContainer,
    		popupAnimeObserver,
    		fullImagePopup,
    		fullDescriptionPopup,
    		windowWidth = window.visualViewport.width,
    		windowHeight = window.visualViewport.height,
    		videoLoops = {};

    	let count = 0;

    	function addPopupObserver() {
    		popupAnimeObserver = new IntersectionObserver(entries => {
    				++count;
    				if (!$popupVisible) return;
    				let intersectingPopupHeaders = [];

    				entries.forEach(entry => {
    					if (!$popupVisible) return;
    					let popupHeader = entry.target;

    					if (entry.isIntersecting) {
    						if (entry.intersectionRatio >= 0.5) {
    							intersectingPopupHeaders.push(popupHeader);
    						} else if (windowHeight <= 360 && entry.intersectionRatio > 0) {
    							intersectingPopupHeaders.push(popupHeader);
    						}
    					}
    				});

    				if (intersectingPopupHeaders.length) {
    					let visiblePopupHeader = getMostVisibleElementFromArray(popupContainer, intersectingPopupHeaders, windowHeight > 360 ? 0.5 : 0) || getMostVisibleElementFromArray(popupContainer, popupContainer.children, 0)?.getElementsByClassName("popup-header")?.[0];
    					mostVisiblePopupHeader = visiblePopupHeader;
    					playMostVisibleTrailer();
    				}
    			},
    		{
    				root: null,
    				rootMargin: "100%",
    				threshold: [0.5, 0]
    			});
    	}

    	function handlePopupVisibility(e) {
    		let target = e.target;
    		let classList = target.classList;
    		if (classList.contains("popup-container") || target.closest(".popup-container")) return;
    		set_store_value(popupVisible, $popupVisible = false, $popupVisible);
    	}

    	function getHiddenStatus(animeID) {
    		if (!$hiddenEntries) {
    			return "N/A";
    		} else if ($hiddenEntries[animeID]) {
    			return "Show";
    		} else {
    			return "Hide";
    		}
    	}

    	async function handleHideShow(animeID) {
    		let isHidden = $hiddenEntries[animeID];

    		if (isHidden) {
    			if (await $confirmPromise("Are you sure you want to show the anime?")) {
    				delete $hiddenEntries[animeID];
    				hiddenEntries.set($hiddenEntries);

    				if ($finalAnimeList.length) {
    					if ($animeLoaderWorker instanceof Worker) {
    						$checkAnimeLoaderStatus().then(() => {
    							$animeLoaderWorker.postMessage({ removeID: animeID });
    						});
    					}
    				}
    			}
    		} else {
    			if (await $confirmPromise("Are you sure you want to hide the anime?")) {
    				set_store_value(hiddenEntries, $hiddenEntries[animeID] = true, $hiddenEntries);

    				if ($finalAnimeList.length) {
    					if ($animeLoaderWorker instanceof Worker) {
    						$checkAnimeLoaderStatus().then(() => {
    							$animeLoaderWorker.postMessage({ removeID: animeID });
    						});
    					}
    				}
    			}
    		}
    	}

    	async function askToOpenYoutube(title) {
    		let animeTitle;

    		if (isJsonObject(title)) {
    			animeTitle = title?.romaji || title?.userPreferred || title?.english || title?.native;
    		} else if (typeof title === "string") {
    			animeTitle = title;
    		}

    		if (typeof animeTitle !== "string" || animeTitle === "") return;

    		if (await $confirmPromise({
    			title: "See Related Videos",
    			text: "Are you sure you want see more related videos in YouTube?"
    		})) {
    			handleMoreVideos(animeTitle);
    		}
    	}

    	async function handleMoreVideos(title) {
    		let animeTitle;

    		if (isJsonObject(title)) {
    			animeTitle = title?.romaji || title?.userPreferred || title?.english || title?.native;
    		} else if (typeof title === "string") {
    			animeTitle = title;
    		}

    		if (typeof animeTitle !== "string" || animeTitle === "") return;
    		window.open(`https://www.youtube.com/results?search_query=${animeTitle} Anime`, "_blank");
    	}

    	animeIdxRemoved.subscribe(async removedIdx => {
    		if ($popupVisible && removedIdx >= 0) {
    			await tick();
    			let newPopupContent = popupContainer?.children[removedIdx];

    			if (newPopupContent instanceof Element && popupContainer instanceof Element) {
    				scrollToElement(popupContainer, newPopupContent, "top");
    			}
    		}
    	});

    	hiddenEntries.subscribe(async val => {
    		if (isJsonObject(val)) {
    			await saveJSON(val, "hiddenEntries");
    		}
    	});

    	popupVisible.subscribe(async val => {
    		if (!(popupWrapper instanceof Element) || !(popupContainer instanceof Element)) return;

    		if (val === true) {
    			// Init Height
    			if (windowWidth >= 641) {
    				popupContainer.style.setProperty("--translateY", windowHeight + "px");
    			} else {
    				popupContainer.style.setProperty("--translateX", windowWidth + "px");
    				mainHome.style.setProperty("--translateX", "-" + windowWidth + "px");
    			}

    			// Scroll To Opened Anime
    			let openedAnimePopupEl = popupContainer?.children[$openedAnimePopupIdx ?? currentHeaderIdx ?? 0];

    			if (openedAnimePopupEl instanceof Element) {
    				scrollToElement(popupContainer, openedAnimePopupEl, "top", "instant");

    				// Animate Opening
    				requestAnimationFrame(() => {
    					addClass(mainHome, "willChange");
    					addClass(popupWrapper, "willChange");
    					addClass(popupContainer, "willChange");
    					addClass(popupWrapper, "visible");
    					addClass(popupContainer, "show");
    					addClass(mainHome, "hide");

    					setTimeout(
    						() => {
    							removeClass(mainHome, "willChange");
    							removeClass(popupWrapper, "willChange");
    							removeClass(popupContainer, "willChange");
    						},
    						300
    					);
    				});

    				// Try to Add YT player
    				currentHeaderIdx = $openedAnimePopupIdx;

    				let openedAnimes = [
    					[$finalAnimeList[$openedAnimePopupIdx], $openedAnimePopupIdx],
    					[$finalAnimeList[$openedAnimePopupIdx + 1], $openedAnimePopupIdx + 1],
    					[$finalAnimeList[$openedAnimePopupIdx - 1], $openedAnimePopupIdx - 1]
    				];

    				let trailerEl = openedAnimes[0][0]?.popupHeader?.querySelector?.(".trailer") || popupContainer?.children?.[$openedAnimePopupIdx]?.querySelector?.(".trailer");
    				let haveTrailer;

    				for (let i = 0; i < $ytPlayers.length; i++) {
    					if ($ytPlayers[i].ytPlayer.g === trailerEl) {
    						haveTrailer = true;

    						if ($autoPlay) {
    							await tick();

    							if (popupWrapper?.classList?.contains?.("visible") && $inApp) {
    								prePlayYtPlayer($ytPlayers[i].ytPlayer);
    								$ytPlayers[i].ytPlayer?.playVideo?.();
    							}

    							break;
    						}
    					}
    				}

    				openedAnimes.forEach(([openedAnime, openedAnimeIdx], idx) => {
    					if (haveTrailer && openedAnime && idx === 0) return; else if (openedAnime) createPopupYTPlayer(openedAnime, openedAnimeIdx);
    				});

    				set_store_value(openedAnimePopupIdx, $openedAnimePopupIdx = null, $openedAnimePopupIdx);
    			} else {
    				// Animate Opening
    				requestAnimationFrame(() => {
    					addClass(mainHome, "willChange");
    					addClass(popupWrapper, "willChange");
    					addClass(popupContainer, "willChange");
    					addClass(popupWrapper, "visible");
    					addClass(popupContainer, "show");
    					addClass(mainHome, "hide");

    					setTimeout(
    						() => {
    							removeClass(mainHome, "willChange");
    							removeClass(popupWrapper, "willChange");
    							removeClass(popupContainer, "willChange");
    						},
    						300
    					);
    				});
    			}
    		} else if (val === false) {
    			requestAnimationFrame(() => {
    				addClass(mainHome, "willChange");
    				addClass(popupWrapper, "willChange");
    				addClass(popupContainer, "willChange");
    				removeClass(popupContainer, "show");
    				removeClass(mainHome, "hide");

    				setTimeout(
    					() => {
    						// Stop All Player
    						$ytPlayers?.forEach(({ ytPlayer }) => ytPlayer?.pauseVideo?.());

    						removeClass(popupWrapper, "visible");
    						removeClass(mainHome, "willChange");
    						removeClass(popupContainer, "willChange");

    						setTimeout(
    							() => {
    								removeClass(popupWrapper, "willChange");
    							},
    							300
    						);
    					},
    					300
    				);
    			});
    		}
    	});

    	finalAnimeList.subscribe(async val => {
    		if (val instanceof Array && val.length) {
    			if (popupAnimeObserver) {
    				popupAnimeObserver?.disconnect?.();
    				popupAnimeObserver = null;
    			}

    			await tick();
    			addPopupObserver();

    			val.forEach(async (anime, animeIdx) => {
    				let popupHeader = anime.popupHeader || popupContainer.children?.[animeIdx]?.querySelector?.(".popup-header");

    				if (popupHeader instanceof Element) {
    					popupAnimeObserver?.observe?.(popupHeader);
    				}
    			});

    			let lastAnimeContent = $finalAnimeList[$finalAnimeList.length - 1];
    			let lastPopupContent = lastAnimeContent.popupContent || popupContainer.children?.[$finalAnimeList.length - 1];

    			if ($animeObserver && lastPopupContent instanceof Element) {
    				// Popup Observed
    				$animeObserver.observe(lastPopupContent);
    			}

    			playMostVisibleTrailer();
    		} else if (val instanceof Array && val.length < 1) {
    			set_store_value(popupVisible, $popupVisible = false, $popupVisible);
    		}
    	});

    	autoPlay.subscribe(async val => {
    		if (typeof val === "boolean") {
    			await saveJSON(val, "autoPlay");

    			if (val === true) {
    				await tick();
    				let visibleTrailer = mostVisiblePopupHeader?.querySelector?.(".trailer");

    				for (let i = 0; i < $ytPlayers.length; i++) {
    					if ($ytPlayers[i].ytPlayer.g === visibleTrailer && $inApp) {
    						prePlayYtPlayer($ytPlayers[i].ytPlayer);
    						$ytPlayers[i].ytPlayer?.playVideo?.();
    					} else {
    						$ytPlayers[i].ytPlayer?.pauseVideo?.();
    					}
    				}
    			} else {
    				$ytPlayers.forEach(({ ytPlayer }) => {
    					ytPlayer?.pauseVideo?.();
    				});
    			}
    		}
    	});

    	onMount(() => {
    		setInterval(
    			() => {
    				$$invalidate(0, date = new Date());
    			},
    			1000
    		);

    		$$invalidate(1, popupWrapper = popupWrapper || document.getElementById("popup-wrapper"));
    		mainHome = document.getElementById("main-home");
    		$$invalidate(2, popupContainer = popupContainer || popupWrapper.querySelector("#popup-container"));
    		animeGridParentEl = document.getElementById("anime-grid");

    		window.addEventListener("resize", () => {
    			if (document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen || document.msFullscreenElement) return;
    			$$invalidate(5, windowWidth = window.visualViewport.width);
    			$$invalidate(6, windowHeight = window.visualViewport.height);
    		});

    		document.addEventListener("keydown", async e => {
    			if (e.key === " " && $popupVisible) {
    				e.preventDefault();
    				let visibleTrailer = mostVisiblePopupHeader?.querySelector?.(".trailer");
    				let isPlaying = $ytPlayers?.some(({ ytPlayer }) => visibleTrailer === ytPlayer.g && ytPlayer?.getPlayerState?.() === 1);

    				$ytPlayers.forEach(({ ytPlayer }) => {
    					ytPlayer?.pauseVideo?.();
    				});

    				if (!isPlaying) {
    					await tick();

    					for (let i = 0; i < $ytPlayers.length; i++) {
    						if ($ytPlayers[i].ytPlayer.g === visibleTrailer && $inApp) {
    							prePlayYtPlayer($ytPlayers[i].ytPlayer);
    							$ytPlayers[i].ytPlayer?.playVideo?.();
    							break;
    						}
    					}
    				}
    			} else if (e.ctrlKey && e.key?.toLowerCase?.() === "x") {
    				e.preventDefault();
    				set_store_value(popupVisible, $popupVisible = !$popupVisible, $popupVisible);
    			} else if (e.ctrlKey && e.key?.toLowerCase?.() === "k") {
    				e.preventDefault();
    				set_store_value(autoPlay, $autoPlay = !$autoPlay, $autoPlay);
    			}
    		});
    	});

    	let scrollToGridTimeout, createPopupPlayersTimeout;

    	async function playMostVisibleTrailer() {
    		if (!$popupVisible) return;
    		await tick();
    		let visibleTrailer = mostVisiblePopupHeader?.querySelector?.(".trailer");

    		// Scroll in Grid
    		let visibleTrailerIdx = getChildIndex(mostVisiblePopupHeader?.closest?.(".popup-content")) ?? -1;

    		if (scrollToGridTimeout) clearTimeout(scrollToGridTimeout);

    		scrollToGridTimeout = setTimeout(
    			() => {
    				if (!$popupVisible) return;
    				let animeGrid = $finalAnimeList?.[visibleTrailerIdx]?.gridElement || animeGridParentEl.children?.[visibleTrailerIdx];

    				if ($popupVisible && animeGrid instanceof Element && !isElementVisible(animeGridParentEl, animeGrid, 0.5)) {
    					document.documentElement.style.overflow = "hidden";
    					document.documentElement.style.overflow = "";
    					animeGridParentEl.style.overflow = "hidden";
    					animeGridParentEl.style.overflow = "";
    					animeGrid.scrollIntoView({ behavior: "smooth", block: "nearest" });
    				}
    			},
    			300
    		);

    		let haveTrailer;

    		if (visibleTrailer instanceof Element) {
    			haveTrailer = $ytPlayers?.some(({ ytPlayer }) => ytPlayer.g === visibleTrailer);
    		}

    		if (haveTrailer) {
    			// Recheck Trailer
    			if (visibleTrailerIdx >= 0) {
    				currentHeaderIdx = visibleTrailerIdx;

    				let nearAnimes = [
    					[$finalAnimeList?.[visibleTrailerIdx + 1], visibleTrailerIdx + 1],
    					[$finalAnimeList?.[visibleTrailerIdx - 1], visibleTrailerIdx - 1]
    				];

    				if (createPopupPlayersTimeout) clearTimeout(createPopupPlayersTimeout);

    				createPopupPlayersTimeout = setTimeout(
    					async () => {
    						if (!$popupVisible) return;

    						nearAnimes.forEach(([nearAnime, nearAnimeIdx]) => {
    							if (nearAnime) createPopupYTPlayer(nearAnime, nearAnimeIdx);
    						});
    					},
    					300
    				);
    			}

    			// Replay Most Visible Trailer
    			for (let i = 0; i < $ytPlayers.length; i++) {
    				if ($ytPlayers[i].ytPlayer.g === visibleTrailer && $ytPlayers[i].ytPlayer?.getPlayerState?.() !== 1 && $autoPlay) {
    					await tick();

    					if (popupWrapper?.classList?.contains?.("visible") && $inApp) {
    						prePlayYtPlayer($ytPlayers[i].ytPlayer);
    						$ytPlayers[i].ytPlayer?.playVideo?.();
    					}
    				} else if ($ytPlayers[i].ytPlayer.g !== visibleTrailer) {
    					$ytPlayers[i].ytPlayer?.pauseVideo?.();
    				}
    			}
    		} else {
    			// Pause All Players
    			$ytPlayers?.forEach(({ ytPlayer }) => ytPlayer?.pauseVideo?.());

    			// Recheck Trailer
    			if (visibleTrailerIdx >= 0) {
    				currentHeaderIdx = visibleTrailerIdx;

    				let nearAnimes = [
    					[$finalAnimeList?.[visibleTrailerIdx], visibleTrailerIdx],
    					[$finalAnimeList?.[visibleTrailerIdx + 1], visibleTrailerIdx + 1],
    					[$finalAnimeList?.[visibleTrailerIdx - 1], visibleTrailerIdx - 1]
    				];

    				if (createPopupPlayersTimeout) clearTimeout(createPopupPlayersTimeout);

    				createPopupPlayersTimeout = setTimeout(
    					async () => {
    						if (!$popupVisible) return;

    						nearAnimes.forEach(([nearAnime, nearAnimeIdx]) => {
    							if (nearAnime) createPopupYTPlayer(nearAnime, nearAnimeIdx);
    						});
    					},
    					300
    				);
    			}
    		}
    	}

    	let failingTrailers = {};

    	function createPopupYTPlayer(openedAnime, headerIdx) {
    		let popupHeader = openedAnime?.popupHeader || popupContainer.children?.[headerIdx]?.querySelector(".popup-header");
    		let ytPlayerEl = popupHeader?.querySelector?.(".trailer") || popupHeader?.querySelector?.(".trailer");
    		let youtubeID = openedAnime?.trailerID;

    		if (ytPlayerEl instanceof Element && youtubeID && typeof YT !== "undefined") {
    			if ($ytPlayers.some(({ ytPlayer }) => ytPlayer.g === ytPlayerEl)) return;
    			addClass(popupHeader, "loader");
    			let popupImg = popupHeader?.querySelector?.(".popup-img");

    			if ($ytPlayers.length >= 3) {
    				let destroyedPlayerIdx = 0;
    				let furthestDistance = -Infinity;

    				$ytPlayers.forEach((_ytPlayer, index) => {
    					if (_ytPlayer.headerIdx === -1) return;
    					let distance = Math.abs(_ytPlayer.headerIdx - currentHeaderIdx);

    					if (distance > furthestDistance) {
    						furthestDistance = distance;
    						destroyedPlayerIdx = index;
    					}
    				});

    				let destroyedPlayer = $ytPlayers?.splice?.(destroyedPlayerIdx, 1)?.[0]?.ytPlayer;
    				let destroyedPopupHeader = destroyedPlayer?.g?.closest?.(".popup-header");
    				destroyedPlayer?.destroy?.();
    				let destroyedPopupImg = destroyedPopupHeader?.querySelector?.(".popup-img");

    				if (destroyedPopupImg instanceof Element) {
    					removeClass(destroyedPopupImg, "display-none");
    				}

    				let newYtPlayerEl = document.createElement("div");
    				newYtPlayerEl.className = "trailer";
    				addClass(ytPlayerEl, "display-none");
    				removeClass(popupImg, "display-none");
    				popupHeader.replaceChild(newYtPlayerEl, ytPlayerEl);
    				addClass(ytPlayerEl, "display-none");
    				ytPlayerEl = popupHeader.querySelector(".trailer"); // Get new YT player
    			} else {
    				addClass(ytPlayerEl, "display-none");
    			}

    			removeClass(popupImg, "display-none");

    			// Add a Unique ID
    			ytPlayerEl.setAttribute("id", "yt-player" + Date.now() + Math.random());

    			let ytPlayer = new YT.Player(ytPlayerEl,
    			{
    					playerVars: {
    						cc_lang_pref: "en", // Set preferred caption language to English
    						cc_load_policy: 1, // Set on by default
    						enablejsapi: 1, // Enable the JavaScript API
    						modestbranding: 1, // Enable modest branding (hide the YouTube logo)
    						playsinline: 1, // Enable inline video playback
    						playlist: youtubeID,
    						rel: 0
    					},
    					events: {
    						onReady: event => {
    							onPlayerReady(event);
    						},
    						onStateChange: event => {
    							onPlayerStateChange(event);
    						},
    						onError: event => {
    							onPlayerError(event);
    						}
    					}
    				});

    			// Add Trailer to Iframe
    			let trailerUrl = `https://www.youtube.com/embed/${youtubeID}`;

    			ytPlayerEl.setAttribute("src", trailerUrl);
    			$ytPlayers.push({ ytPlayer, headerIdx });
    		} else {
    			let popupImg = popupHeader?.querySelector?.(".popup-img");
    			removeClass(popupHeader, "loader");
    			removeClass(popupImg, "display-none");
    		}
    	}

    	function onPlayerError(event) {
    		let ytPlayer = event.target;
    		let trailerEl = ytPlayer?.g;
    		let popupHeader = trailerEl?.parentElement;
    		let popupImg = popupHeader?.querySelector?.(".popup-img");
    		set_store_value(ytPlayers, $ytPlayers = $ytPlayers.filter(_ytPlayer => _ytPlayer.ytPlayer !== ytPlayer), $ytPlayers);
    		ytPlayer.destroy();
    		addClass(trailerEl, "display-none");
    		removeClass(popupHeader, "loader");
    		removeClass(popupImg, "display-none");
    	}

    	function onPlayerStateChange(event) {
    		let _ytPlayer = event.target;
    		if (!_ytPlayer || !_ytPlayer?.getPlayerState) return;
    		let trailerEl = _ytPlayer?.g;
    		let popupHeader = trailerEl?.parentElement;
    		let popupImg = popupHeader?.querySelector?.(".popup-img");

    		if (_ytPlayer?.getPlayerState?.() === 0) {
    			_ytPlayer?.stopVideo?.();
    			let popupContent = popupHeader?.closest?.(".popup-content");
    			let loopedAnimeID = $finalAnimeList?.[getChildIndex(popupContent) ?? -1]?.id;

    			if (loopedAnimeID != null) {
    				if (videoLoops[loopedAnimeID]) {
    					clearTimeout(videoLoops[loopedAnimeID]);
    					videoLoops[loopedAnimeID] = null;
    				}

    				videoLoops[loopedAnimeID] = setTimeout(
    					() => {
    						if (mostVisiblePopupHeader === popupHeader && _ytPlayer?.getPlayerState?.() === 5 && _ytPlayer.g && $inApp && $popupVisible && $autoPlay) {
    							_ytPlayer?.playVideo?.();
    						}
    					},
    					8 * 1000
    				); // Play Again after 8 seconds
    			}
    		}

    		if (_ytPlayer?.getPlayerState?.() === 1 && (trailerEl?.classList?.contains?.("display-none") || !popupImg?.classList?.contains?.("display-none"))) {
    			$ytPlayers?.forEach(({ ytPlayer }) => ytPlayer?.g !== _ytPlayer?.g && ytPlayer?.pauseVideo?.());
    			currentYtPlayer = _ytPlayer;
    			addClass(popupImg, "fade-out");
    			removeClass(popupHeader, "loader");
    			removeClass(trailerEl, "display-none");

    			setTimeout(
    				() => {
    					addClass(popupImg, "display-none");
    					removeClass(popupImg, "fade-out");
    				},
    				300
    			);
    		}
    	}

    	async function onPlayerReady(event) {
    		let ytPlayer = event.target;
    		let trailerEl = ytPlayer?.g;
    		let popupHeader = trailerEl?.parentElement;
    		let popupContent = popupHeader?.closest?.(".popup-content");
    		let anime = $finalAnimeList?.[getChildIndex(popupContent) ?? -1];

    		if (ytPlayer.getPlayerState() === -1 || trailerEl.tagName !== "IFRAME" || !isOnline) {
    			if (anime?.id) {
    				failingTrailers[anime.id] = true;
    			}

    			set_store_value(ytPlayers, $ytPlayers = $ytPlayers.filter(_ytPlayer => _ytPlayer.ytPlayer !== ytPlayer), $ytPlayers);
    			ytPlayer.destroy();
    			addClass(trailerEl, "display-none");
    			removeClass(popupHeader, "loader");
    			let popupImg = popupHeader?.querySelector?.(".popup-img");
    			removeClass(popupImg, "display-none");
    		} else {
    			// Play Most Visible when 1 Succeed
    			trailerEl?.setAttribute?.("loading", "lazy");

    			if (!$autoPlay) {
    				let popupImg = popupHeader?.querySelector?.(".popup-img");
    				addClass(popupImg, "fade-out");
    				removeClass(popupHeader, "loader");
    				removeClass(trailerEl, "display-none");

    				setTimeout(
    					() => {
    						addClass(popupImg, "display-none");
    						removeClass(popupImg, "fade-out");
    					},
    					300
    				);
    			}

    			playMostVisibleTrailer();

    			if (anime?.id) {
    				delete failingTrailers[anime.id];
    			}
    		}
    	}

    	function prePlayYtPlayer(ytPlayer) {
    		if (currentYtPlayer?.isMuted && currentYtPlayer?.getVolume) {
    			let isMuted = currentYtPlayer?.isMuted?.();
    			let ytVolume = currentYtPlayer?.getVolume?.();

    			if (typeof isMuted == "boolean") {
    				if (isMuted) {
    					ytPlayer?.mute?.();
    				} else {
    					ytPlayer?.unMute?.();
    				}
    			}

    			if (typeof ytVolume === "number") {
    				if (savedYtVolume !== ytVolume) {
    					savedYtVolume = ytVolume;
    					saveJSON(savedYtVolume, "savedYtVolume");
    				}

    				ytPlayer?.setVolume?.(savedYtVolume);
    			}
    		}
    	}

    	let updateListIconSpinningTimeout;

    	async function updateList(event) {
    		if (await $confirmPromise({
    			title: "List update is available",
    			text: "Are you sure you want to refresh the list?"
    		})) {
    			let element = event.target;
    			let classList = element.classList;
    			let updateIcon;

    			if (classList.contains("list-update-container")) {
    				updateIcon = element.querySelector?.(".list-update-icon");
    			} else {
    				updateIcon = element?.closest(".list-update-container")?.querySelector?.(".list-update-icon");
    			}

    			if (updateListIconSpinningTimeout) clearTimeout(updateListIconSpinningTimeout);
    			addClass(updateIcon, "fa-spin");

    			if ($animeLoaderWorker) {
    				$animeLoaderWorker.terminate();
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    			}

    			animeLoader().then(async data => {
    				set_store_value(listUpdateAvailable, $listUpdateAvailable = false, $listUpdateAvailable);

    				updateListIconSpinningTimeout = setTimeout(
    					() => {
    						removeClass(updateIcon, "fa-spin");
    					},
    					300
    				);

    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);
    				set_store_value(searchedAnimeKeyword, $searchedAnimeKeyword = "", $searchedAnimeKeyword);

    				if (data?.isNew) {
    					set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
    					set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries, $hiddenEntries);
    					set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid, $numberOfNextLoadedGrid);
    				}

    				set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    				return;
    			}).catch(error => {
    				throw error;
    			});
    		}
    	}

    	function getUserStatusColor(userStatus) {
    		if (ncsCompare(userStatus, "completed")) {
    			return "green";
    		} else if (ncsCompare(userStatus, "current") || ncsCompare(userStatus, "repeating")) {
    			return "blue";
    		} else if (ncsCompare(userStatus, "planning")) {
    			return "orange";
    		} else if (ncsCompare(userStatus, "paused")) {
    			return "peach";
    		} else if (ncsCompare(userStatus, "dropped")) {
    			return "red";
    		} else {
    			return ""; // Default Unwatched Icon Color
    		}
    	}

    	function getTags(tags, favouriteTags, contentCaution) {
    		if (!tags?.length) return tags;

    		let haveFavorite = isJsonObject(favouriteTags) && !jsonIsEmpty(favouriteTags),
    			haveCaution = isJsonObject(contentCaution) && !jsonIsEmpty(contentCaution);

    		let caution = {}, semiCaution = {};

    		if (haveCaution) {
    			contentCaution?.caution.forEach(tag => {
    				caution[tag.trim().toLowerCase()] = true;
    			});

    			contentCaution?.semiCaution.forEach(tag => {
    				semiCaution[tag.trim().toLowerCase()] = true;
    			});
    		}

    		let _favouriteTags = [], tagCaution = [], tagSemiCaution = [], otherTags = [];
    		let tagsRunnned = {};

    		tags.sort((a, b) => {
    			return b?.rank - a?.rank;
    		});

    		tags.forEach(tag => {
    			let tagName = tag?.name || tag;
    			let tagRank = tag?.rank;
    			if (!tagName) return;
    			let trimmedTag = tagName?.trim?.().toLowerCase?.();

    			if (haveCaution) {
    				if (caution[trimmedTag]) {
    					tagsRunnned[tagName] = true;

    					tagCaution.push({
    						tag: `<span>${tagName}${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`,
    						tagColor: "red"
    					});
    				} else if (semiCaution[trimmedTag]) {
    					tagsRunnned[tagName] = true;

    					tagSemiCaution.push({
    						tag: `<span>${tagName}${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`,
    						tagColor: "teal"
    					});
    				}
    			}

    			if (haveFavorite && !tagsRunnned[tagName]) {
    				if (favouriteTags[trimmedTag]) {
    					tagsRunnned[tagName] = true;
    					_favouriteTags.push({ tag, score: favouriteTags[trimmedTag] });
    				}
    			}

    			if (!tagsRunnned[tagName]) {
    				otherTags.push({
    					tag: `<span>${tagName}${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`,
    					tagColor: null
    				});
    			}
    		});

    		_favouriteTags.sort((a, b) => {
    			return b.score - a.score;
    		});

    		_favouriteTags = _favouriteTags.map(e => {
    			let tagName = e?.tag?.name || e?.tag;
    			let tagRank = e?.tag?.rank;

    			return {
    				tag: `<span>${tagName} (${formatNumber(e.score)})${tagRank ? "</span><span> " + tagRank + "%" : ""}</span>`,
    				tagColor: "green"
    			};
    		});

    		return tagCaution.concat(tagSemiCaution).concat(_favouriteTags).concat(otherTags);
    	}

    	function getStudios(studios, favouriteStudios) {
    		if (!studios?.length) return studios;
    		let haveFavorite = isJsonObject(favouriteStudios) && !jsonIsEmpty(favouriteStudios);
    		let _favouriteStudios = [], otherStudios = [];

    		studios.forEach(([studio, studioUrl]) => {
    			if (haveFavorite) {
    				let trimmedStudio = studio?.trim?.().toLowerCase?.();

    				if (favouriteStudios[trimmedStudio]) {
    					_favouriteStudios.push({
    						studio: [studio, studioUrl],
    						score: favouriteStudios[trimmedStudio]
    					});
    				} else {
    					otherStudios.push({
    						studio: { studioName: studio, studioUrl },
    						studioColor: null
    					});
    				}
    			} else {
    				otherStudios.push({
    					studio: { studioName: studio, studioUrl },
    					studioColor: null
    				});
    			}
    		});

    		_favouriteStudios.sort((a, b) => {
    			return b.score - a.score;
    		});

    		_favouriteStudios = _favouriteStudios.map(e => {
    			return {
    				studio: {
    					studioName: `${e.studio[0]} (${formatNumber(e.score)})`,
    					studioUrl: e.studio[1]
    				},
    				studioColor: "green"
    			};
    		});

    		return _favouriteStudios.concat(otherStudios);
    	}

    	function getGenres(genres, favouriteGenres, contentCaution) {
    		if (!genres?.length) return genres;

    		let haveFavorite = isJsonObject(favouriteGenres) && !jsonIsEmpty(favouriteGenres),
    			haveCaution = isJsonObject(contentCaution) && !jsonIsEmpty(contentCaution);

    		let caution = {}, semiCaution = {};

    		if (haveCaution) {
    			contentCaution?.caution.forEach(genre => {
    				caution[genre.trim().toLowerCase()] = true;
    			});

    			contentCaution?.semiCaution.forEach(genre => {
    				semiCaution[genre.trim().toLowerCase()] = true;
    			});
    		}

    		let _favouriteGenres = [],
    			genreCaution = [],
    			genreSemiCaution = [],
    			otherGenres = [];

    		let genresRunnned = {};

    		genres.forEach(genre => {
    			let trimmedGenre = genre?.trim?.().toLowerCase?.();

    			if (haveCaution) {
    				if (caution[trimmedGenre]) {
    					genresRunnned[genre] = true;
    					genreCaution.push({ genre, genreColor: "red" });
    				} else if (semiCaution[trimmedGenre]) {
    					genresRunnned[genre] = true;
    					genreSemiCaution.push({ genre, genreColor: "teal" });
    				}
    			}

    			if (haveFavorite && !genresRunnned[genre]) {
    				if (favouriteGenres[trimmedGenre]) {
    					genresRunnned[genre] = true;

    					_favouriteGenres.push({
    						genre,
    						score: favouriteGenres[trimmedGenre]
    					});
    				}
    			}

    			if (!genresRunnned[genre]) {
    				otherGenres.push({ genre, genreColor: null });
    			}
    		});

    		_favouriteGenres.sort((a, b) => {
    			return b.score - a.score;
    		});

    		_favouriteGenres = _favouriteGenres.map(e => {
    			return {
    				genre: `${e.genre} (${formatNumber(e.score)})`,
    				genreColor: "green"
    			};
    		});

    		return _favouriteGenres.concat(genreCaution).concat(genreSemiCaution).concat(otherGenres);
    	}

    	function getFormattedAnimeFormat({ episodes, format, duration, nextAiringEpisode }) {
    		// ONA · 12 · 24m · LOW SCORE
    		let text = "";

    		if (format) {
    			text = `${format}`;
    			let timeDifMS;
    			let nextEpisode;
    			let nextAiringDate;

    			if (typeof nextAiringEpisode?.episode === "number" && typeof nextAiringEpisode?.airingAt === "number") {
    				nextAiringDate = new Date(nextAiringEpisode?.airingAt * 1000);
    				nextEpisode = nextAiringEpisode?.episode;

    				if (nextAiringDate instanceof Date && !isNaN(nextAiringDate)) {
    					timeDifMS = nextAiringDate.getTime() - new Date().getTime();
    				}
    			}

    			if (timeDifMS > 0 && typeof nextEpisode === "number" && episodes > nextEpisode) {
    				text += ` · <span style="color:rgb(61, 180, 242);">${nextEpisode}/${episodes} in ${formatDateDifference(nextAiringDate, timeDifMS)}</span>`;
    			} else if (timeDifMS > 0 && typeof nextEpisode === "number") {
    				text += ` · <span style="color:rgb(61, 180, 242);">Ep ${nextEpisode} in ${formatDateDifference(nextAiringDate, timeDifMS)}</span>`;
    			} else if (timeDifMS <= 0 && typeof nextEpisode === "number" && episodes > nextEpisode) {
    				text += ` · ${nextEpisode}/${episodes}`;
    			} else if (episodes > 0) {
    				text += ` · ${episodes}`;
    			}

    			if (duration > 0) {
    				let time = msToTime(duration * 60 * 1000);
    				text += ` · ${time ? time : ""}`;
    			}
    		}

    		return text;
    	}

    	function formatDateDifference(endDate, timeDifference) {
    		const oneMinute = 60 * 1000; // Number of milliseconds in one minute
    		const oneHour = 60 * oneMinute; // Number of milliseconds in one hour
    		const oneDay = 24 * oneHour; // Number of milliseconds in one day
    		const oneWeek = 7 * oneDay; // Number of milliseconds in one day
    		const formatYear = date => date.toLocaleDateString(undefined, { year: "numeric" });
    		const formatMonth = date => date.toLocaleDateString(undefined, { month: "short" });
    		const formatDay = date => date.toLocaleDateString(undefined, { day: "numeric" });

    		const formatTime = date => date.toLocaleTimeString(undefined, {
    			hour: "numeric",
    			minute: "2-digit",
    			hour12: true
    		});

    		const formatWeekday = date => date.toLocaleDateString(undefined, { weekday: "short" });

    		if (timeDifference > oneWeek) {
    			return `${msToTime(timeDifference, 1)}, ${formatMonth(endDate)} ${formatDay(endDate)} ${formatYear(endDate)}`;
    		} else if (timeDifference <= oneWeek && timeDifference > oneDay) {
    			return `${msToTime(timeDifference, 1)}, ${formatWeekday(endDate)}, ${formatTime(endDate).toLowerCase()}`;
    		} else {
    			return `${msToTime(timeDifference, 2)}, ${formatTime(endDate).toLowerCase()}`;
    		}
    	}

    	// Global Function For Android
    	let isCurrentlyPlaying = false;

    	window.returnedAppIsVisible = inAndroidApp => {
    		// Only For Android, and workaround for Alert visibility
    		if (!$android) return;

    		set_store_value(inApp, $inApp = inAndroidApp, $inApp);
    		if (!$popupVisible || $initData) return;
    		let visibleTrailer = mostVisiblePopupHeader?.querySelector?.(".trailer");
    		if (!visibleTrailer) return;

    		if ($inApp) {
    			for (let i = 0; i < $ytPlayers.length; i++) {
    				if ($ytPlayers[i]?.ytPlayer.g === visibleTrailer && ($autoPlay || $ytPlayers[i]?.ytPlayer?.getPlayerState?.() === 2 && isCurrentlyPlaying)) {
    					prePlayYtPlayer($ytPlayers[i]?.ytPlayer);
    					$ytPlayers[i]?.ytPlayer?.playVideo?.();
    				} else {
    					$ytPlayers[i]?.ytPlayer?.pauseVideo?.();
    				}
    			}
    		} else {
    			isCurrentlyPlaying = false;

    			for (let i = 0; i < $ytPlayers.length; i++) {
    				if ($ytPlayers[i]?.ytPlayer.g === visibleTrailer && $ytPlayers[i]?.ytPlayer?.getPlayerState?.() === 1) {
    					isCurrentlyPlaying = true;
    				}

    				$ytPlayers[i]?.ytPlayer?.pauseVideo?.();
    			}
    		}
    	};

    	document.addEventListener("visibilitychange", () => {
    		// Only for Browsers
    		if ($android) return;

    		set_store_value(inApp, $inApp = document.visibilityState === "visible", $inApp);
    		if (!$popupVisible || $initData) return;
    		let visibleTrailer = mostVisiblePopupHeader?.querySelector?.(".trailer");
    		if (!visibleTrailer) return;

    		if ($inApp) {
    			for (let i = 0; i < $ytPlayers.length; i++) {
    				if ($ytPlayers[i]?.ytPlayer.g === visibleTrailer && ($autoPlay || $ytPlayers[i]?.ytPlayer?.getPlayerState?.() === 2 && isCurrentlyPlaying)) {
    					prePlayYtPlayer($ytPlayers[i]?.ytPlayer);
    					$ytPlayers[i]?.ytPlayer?.playVideo?.();
    				} else {
    					$ytPlayers[i]?.ytPlayer?.pauseVideo?.();
    				}
    			}
    		} else {
    			isCurrentlyPlaying = false;

    			for (let i = 0; i < $ytPlayers.length; i++) {
    				if ($ytPlayers[i]?.ytPlayer.g === visibleTrailer && $ytPlayers[i]?.ytPlayer?.getPlayerState?.() === 1) {
    					isCurrentlyPlaying = true;
    				}

    				$ytPlayers[i]?.ytPlayer?.pauseVideo?.();
    			}
    		}
    	});

    	window.addEventListener("online", () => {
    		if ($android) {
    			try {
    				JSBridge.isOnline(true);
    			} catch(e) {
    				
    			}
    		}

    		set_store_value(dataStatus, $dataStatus = "Reconnected Successfully", $dataStatus);

    		if ($initData) {
    			set_store_value(initData, $initData = false, $initData);
    		}

    		if (!$finalAnimeList?.length) {
    			set_store_value(updateRecommendationList, $updateRecommendationList = !$updateRecommendationList, $updateRecommendationList);
    		}

    		isOnline = true;

    		document.querySelectorAll("script")?.forEach(script => {
    			if (script.src && script.src !== "https://www.youtube.com/iframe_api?v=16") {
    				script.src = script.src;
    			}
    		});

    		document.querySelectorAll("img")?.forEach(image => {
    			if (!image.naturalHeight) {
    				image.src = image.src;
    			}
    		});

    		reloadYoutube();
    	});

    	function reloadYoutube() {
    		loadYouTubeAPI().then(() => {
    			set_store_value(
    				ytPlayers,
    				$ytPlayers = $ytPlayers.filter(({ ytPlayer }) => {
    					if (typeof ytPlayer?.playVideo === "function" && ytPlayer.getPlayerState() !== -1 && !isNaN(ytPlayer.getPlayerState())) {
    						return true;
    					} else {
    						ytPlayer.destroy();
    						let popupImg = ytPlayer?.g?.closest?.(".popup-header")?.querySelector?.(".popup-img");

    						if (popupImg instanceof Element) {
    							removeClass(popupImg, "display-none");
    						}

    						return false;
    					}
    				}),
    				$ytPlayers
    			);

    			playMostVisibleTrailer();
    		});
    	}

    	window.reloadYoutube = reloadYoutube;

    	window.addEventListener("offline", () => {
    		if ($android) {
    			try {
    				JSBridge.isOnline(false);
    			} catch(e) {
    				
    			}
    		}

    		set_store_value(dataStatus, $dataStatus = "Currently Offline...", $dataStatus);
    		isOnline = false;
    	});

    	let touchID, checkPointer, startX, endX, startY, endY, goBackPercent;

    	function itemScroll() {
    		set_store_value(popupIsGoingBack, $popupIsGoingBack = false, $popupIsGoingBack);
    		$$invalidate(7, goBackPercent = 0);
    	}

    	function handlePopupContainerDown(event) {
    		startX = event.touches[0].clientX;
    		startY = event.touches[0].clientY;
    		touchID = event.touches[0].identifier;
    		let element = event.target;
    		let closestScrollableLeftElement = element;
    		let hasScrollableLeftElement = false;

    		while (closestScrollableLeftElement && closestScrollableLeftElement !== document.body) {
    			const isScrollableLeft = closestScrollableLeftElement.scrollWidth > closestScrollableLeftElement.clientWidth && closestScrollableLeftElement.scrollLeft > 0;

    			if (isScrollableLeft) {
    				if (closestScrollableLeftElement.id === "popup-container") {
    					hasScrollableLeftElement = false;
    				} else {
    					hasScrollableLeftElement = true;
    				}

    				break;
    			}

    			closestScrollableLeftElement = closestScrollableLeftElement.parentElement;
    		}

    		if (hasScrollableLeftElement) return;
    		checkPointer = true;
    	}

    	function handlePopupContainerMove(event) {
    		if (checkPointer) {
    			checkPointer = false;
    			endX = event.touches[0].clientX;
    			endY = event.touches[0].clientY;
    			const deltaX = endX - startX;
    			const deltaY = endY - startY;

    			if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
    				set_store_value(popupIsGoingBack, $popupIsGoingBack = true, $popupIsGoingBack);
    			}
    		} else if ($popupIsGoingBack) {
    			endX = event.touches[0].clientX;
    			const deltaX = endX - startX;

    			if (deltaX > 0) {
    				$$invalidate(7, goBackPercent = Math.min(deltaX / 48 * 100, 100));
    			} else {
    				$$invalidate(7, goBackPercent = 0);
    			}
    		}
    	}

    	function handlePopupContainerUp(event) {
    		if ($popupIsGoingBack) {
    			endX = Array.from(event.changedTouches)?.find(touch => touch.identifier === touchID)?.clientX;

    			if (typeof endX === 'number') {
    				let xThreshold = 48;
    				let deltaX = endX - startX;

    				if ($popupIsGoingBack && deltaX >= xThreshold) {
    					set_store_value(popupVisible, $popupVisible = false, $popupVisible);
    				}
    			}

    			touchID = null;
    			set_store_value(popupIsGoingBack, $popupIsGoingBack = false, $popupIsGoingBack);
    			$$invalidate(7, goBackPercent = 0);
    		} else {
    			touchID = null;
    			set_store_value(popupIsGoingBack, $popupIsGoingBack = false, $popupIsGoingBack);
    			$$invalidate(7, goBackPercent = 0);
    		}
    	}

    	function handlePopupContainerCancel() {
    		touchID = null;
    		set_store_value(popupIsGoingBack, $popupIsGoingBack = false, $popupIsGoingBack);
    		$$invalidate(7, goBackPercent = 0);
    	}

    	window.checkOpenFullScreenItem = () => {
    		return fullImagePopup || fullDescriptionPopup;
    	};

    	window.closeFullScreenItem = () => {
    		if (fullImagePopup) {
    			$$invalidate(3, fullImagePopup = null);
    		} else {
    			$$invalidate(4, fullDescriptionPopup = null);
    		}
    	};

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AnimePopup> was created with unknown prop '${key}'`);
    	});

    	const load_handler = e => {
    		removeClass(e.target, "fade-out");
    		addClass(e.target, "fade-in");
    	};

    	const error_handler = e => {
    		removeClass(e.target, "fade-in");
    		addClass(e.target, "fade-out");
    		addClass(e.target, "display-none");
    	};

    	function div2_binding($$value, each_value, animeIdx) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			each_value[animeIdx].popupHeader = $$value;
    		});
    	}

    	const click_handler = anime => askToOpenYoutube(anime.title);
    	const keydown_handler = (anime, e) => e.key === "Enter" && askToOpenYoutube(anime.title);

    	function input_change_handler() {
    		$autoPlay = this.checked;
    		autoPlay.set($autoPlay);
    	}

    	const keydown_handler_1 = e => e.key === "Enter" && (() => set_store_value(autoPlay, $autoPlay = !$autoPlay, $autoPlay))();
    	const keydown_handler_2 = e => e.key === "Enter" && updateList(e);

    	const mouseenter_handler = (anime, each_value, animeIdx, e) => {
    		if (!anime?.hasStudioDragScroll) {
    			let info = e?.target?.closest?.(".info") || e?.target;

    			if (info) {
    				set_store_value(finalAnimeList, each_value[animeIdx].hasStudioDragScroll = true, $finalAnimeList);
    				dragScroll(info, "x");
    			}
    		}
    	};

    	const mouseenter_handler_1 = (anime, each_value, animeIdx, e) => {
    		if (!anime?.hasGenreDragScroll) {
    			let info = e?.target?.closest?.(".info") || e?.target;

    			if (info) {
    				set_store_value(finalAnimeList, each_value[animeIdx].hasGenreDragScroll = true, $finalAnimeList);
    				dragScroll(info, "x");
    			}
    		}
    	};

    	const mouseenter_handler_2 = (anime, each_value, animeIdx, e) => {
    		if (!anime?.hasTagDragScroll) {
    			let info = e?.target?.closest?.(".info") || e?.target;

    			if (info) {
    				set_store_value(finalAnimeList, each_value[animeIdx].hasTagDragScroll = true, $finalAnimeList);
    				dragScroll(info, "x");
    			}
    		}
    	};

    	const load_handler_1 = e => {
    		removeClass(e.target, "display-none");
    	};

    	const error_handler_1 = e => {
    		addClass(e.target, "display-none");
    	};

    	const click_handler_1 = anime => {
    		window.setShouldGoBack(false);
    		$$invalidate(3, fullImagePopup = anime.coverImageUrl);
    	};

    	const keydown_handler_3 = (anime, e) => {
    		window.setShouldGoBack(false);
    		if (e.key === "Enter") $$invalidate(3, fullImagePopup = anime.coverImageUrl);
    	};

    	const load_handler_2 = e => {
    		removeClass(e.target, "display-none");
    	};

    	const error_handler_2 = e => {
    		addClass(e.target, "display-none");
    	};

    	const click_handler_2 = anime => {
    		window.setShouldGoBack(false);
    		$$invalidate(3, fullImagePopup = anime.bannerImageUrl);
    	};

    	const keydown_handler_4 = (anime, e) => {
    		window.setShouldGoBack(false);
    		if (e.key === "Enter") $$invalidate(3, fullImagePopup = anime.bannerImageUrl);
    	};

    	const click_handler_3 = anime => {
    		window.setShouldGoBack(false);
    		$$invalidate(4, fullDescriptionPopup = editHTMLString(anime?.description));
    	};

    	const keydown_handler_5 = (anime, e) => {
    		window.setShouldGoBack(false);
    		if (e.key === "Enter") $$invalidate(4, fullDescriptionPopup = editHTMLString(anime?.description));
    	};

    	const keydown_handler_6 = (anime, e) => e.key === "Enter" && handleHideShow(anime.id);

    	const click_handler_4 = (anime, each_value, animeIdx) => {
    		if (anime.isSeenMore) {
    			openInAnilist(anime.animeUrl);
    		} else {
    			set_store_value(finalAnimeList, each_value[animeIdx].isSeenMore = true, $finalAnimeList);
    		}
    	};

    	const keydown_handler_7 = (anime, each_value, animeIdx, e) => {
    		if (e.key === "Enter") {
    			if (anime.isSeenMore) {
    				openInAnilist(anime.animeUrl);
    			} else {
    				set_store_value(finalAnimeList, each_value[animeIdx].isSeenMore = true, $finalAnimeList);
    			}
    		}
    	};

    	const keydown_handler_8 = (anime, e) => e.key === "Enter" && handleMoreVideos(anime.title);

    	function div15_binding($$value, each_value, animeIdx) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			each_value[animeIdx].popupContent = $$value;
    		});
    	}

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			popupContainer = $$value;
    			$$invalidate(2, popupContainer);
    		});
    	}

    	const keydown_handler_9 = e => e.key === "Enter" && handlePopupVisibility(e);

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			popupWrapper = $$value;
    			$$invalidate(1, popupWrapper);
    		});
    	}

    	const error_handler_3 = e => {
    		addClass(e.target, "display-none");
    	};

    	const click_handler_5 = () => $$invalidate(3, fullImagePopup = null);
    	const keydown_handler_10 = e => e.key === "Enter" && $$invalidate(3, fullImagePopup = null);
    	const pointerup_handler = () => $$invalidate(3, fullImagePopup = null);
    	const click_handler_6 = () => $$invalidate(4, fullDescriptionPopup = null);
    	const keydown_handler_11 = e => e.key === "Enter" && $$invalidate(4, fullDescriptionPopup = null);
    	const pointerup_handler_1 = () => $$invalidate(4, fullDescriptionPopup = null);

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		fly,
    		finalAnimeList,
    		animeLoaderWorker: animeLoaderWorker$1,
    		hiddenEntries,
    		ytPlayers,
    		autoPlay,
    		animeObserver,
    		popupVisible,
    		openedAnimePopupIdx,
    		android,
    		inApp,
    		confirmPromise,
    		animeIdxRemoved,
    		shownAllInList,
    		dataStatus,
    		initData,
    		updateRecommendationList,
    		listUpdateAvailable,
    		searchedAnimeKeyword,
    		checkAnimeLoaderStatus,
    		numberOfNextLoadedGrid,
    		popupIsGoingBack,
    		isJsonObject,
    		formatNumber,
    		scrollToElement,
    		getChildIndex,
    		msToTime,
    		isElementVisible,
    		addClass,
    		removeClass,
    		getMostVisibleElementFromArray,
    		jsonIsEmpty,
    		ncsCompare,
    		dragScroll,
    		retrieveJSON,
    		saveJSON,
    		animeLoader,
    		isOnline,
    		date,
    		savedYtVolume,
    		animeGridParentEl,
    		mostVisiblePopupHeader,
    		currentHeaderIdx,
    		currentYtPlayer,
    		mainHome,
    		popupWrapper,
    		popupContainer,
    		popupAnimeObserver,
    		fullImagePopup,
    		fullDescriptionPopup,
    		windowWidth,
    		windowHeight,
    		videoLoops,
    		count,
    		addPopupObserver,
    		handlePopupVisibility,
    		getHiddenStatus,
    		handleHideShow,
    		askToOpenYoutube,
    		handleMoreVideos,
    		openInAnilist,
    		getCautionColor,
    		scrollToGridTimeout,
    		createPopupPlayersTimeout,
    		playMostVisibleTrailer,
    		failingTrailers,
    		createPopupYTPlayer,
    		onPlayerError,
    		onPlayerStateChange,
    		onPlayerReady,
    		prePlayYtPlayer,
    		updateListIconSpinningTimeout,
    		updateList,
    		getUserStatusColor,
    		getTags,
    		getStudios,
    		getGenres,
    		getFormattedAnimeFormat,
    		formatDateDifference,
    		getRecommendationRatingInfo,
    		isCurrentlyPlaying,
    		reloadYoutube,
    		loadYouTubeAPI,
    		htmlToString,
    		editHTMLString,
    		touchID,
    		checkPointer,
    		startX,
    		endX,
    		startY,
    		endY,
    		goBackPercent,
    		itemScroll,
    		handlePopupContainerDown,
    		handlePopupContainerMove,
    		handlePopupContainerUp,
    		getTitle,
    		handlePopupContainerCancel,
    		$popupIsGoingBack,
    		$popupVisible,
    		$dataStatus,
    		$android,
    		$ytPlayers,
    		$updateRecommendationList,
    		$finalAnimeList,
    		$initData,
    		$autoPlay,
    		$inApp,
    		$numberOfNextLoadedGrid,
    		$hiddenEntries,
    		$searchedAnimeKeyword,
    		$animeLoaderWorker,
    		$listUpdateAvailable,
    		$confirmPromise,
    		$animeObserver,
    		$openedAnimePopupIdx,
    		$checkAnimeLoaderStatus,
    		$shownAllInList
    	});

    	$$self.$inject_state = $$props => {
    		if ('isOnline' in $$props) isOnline = $$props.isOnline;
    		if ('date' in $$props) $$invalidate(0, date = $$props.date);
    		if ('savedYtVolume' in $$props) savedYtVolume = $$props.savedYtVolume;
    		if ('animeGridParentEl' in $$props) animeGridParentEl = $$props.animeGridParentEl;
    		if ('mostVisiblePopupHeader' in $$props) mostVisiblePopupHeader = $$props.mostVisiblePopupHeader;
    		if ('currentHeaderIdx' in $$props) currentHeaderIdx = $$props.currentHeaderIdx;
    		if ('currentYtPlayer' in $$props) currentYtPlayer = $$props.currentYtPlayer;
    		if ('mainHome' in $$props) mainHome = $$props.mainHome;
    		if ('popupWrapper' in $$props) $$invalidate(1, popupWrapper = $$props.popupWrapper);
    		if ('popupContainer' in $$props) $$invalidate(2, popupContainer = $$props.popupContainer);
    		if ('popupAnimeObserver' in $$props) popupAnimeObserver = $$props.popupAnimeObserver;
    		if ('fullImagePopup' in $$props) $$invalidate(3, fullImagePopup = $$props.fullImagePopup);
    		if ('fullDescriptionPopup' in $$props) $$invalidate(4, fullDescriptionPopup = $$props.fullDescriptionPopup);
    		if ('windowWidth' in $$props) $$invalidate(5, windowWidth = $$props.windowWidth);
    		if ('windowHeight' in $$props) $$invalidate(6, windowHeight = $$props.windowHeight);
    		if ('videoLoops' in $$props) videoLoops = $$props.videoLoops;
    		if ('count' in $$props) count = $$props.count;
    		if ('scrollToGridTimeout' in $$props) scrollToGridTimeout = $$props.scrollToGridTimeout;
    		if ('createPopupPlayersTimeout' in $$props) createPopupPlayersTimeout = $$props.createPopupPlayersTimeout;
    		if ('failingTrailers' in $$props) failingTrailers = $$props.failingTrailers;
    		if ('updateListIconSpinningTimeout' in $$props) updateListIconSpinningTimeout = $$props.updateListIconSpinningTimeout;
    		if ('isCurrentlyPlaying' in $$props) isCurrentlyPlaying = $$props.isCurrentlyPlaying;
    		if ('touchID' in $$props) touchID = $$props.touchID;
    		if ('checkPointer' in $$props) checkPointer = $$props.checkPointer;
    		if ('startX' in $$props) startX = $$props.startX;
    		if ('endX' in $$props) endX = $$props.endX;
    		if ('startY' in $$props) startY = $$props.startY;
    		if ('endY' in $$props) endY = $$props.endY;
    		if ('goBackPercent' in $$props) $$invalidate(7, goBackPercent = $$props.goBackPercent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		date,
    		popupWrapper,
    		popupContainer,
    		fullImagePopup,
    		fullDescriptionPopup,
    		windowWidth,
    		windowHeight,
    		goBackPercent,
    		$popupIsGoingBack,
    		$popupVisible,
    		$finalAnimeList,
    		$autoPlay,
    		$listUpdateAvailable,
    		$shownAllInList,
    		handlePopupVisibility,
    		getHiddenStatus,
    		handleHideShow,
    		askToOpenYoutube,
    		handleMoreVideos,
    		updateList,
    		getUserStatusColor,
    		getTags,
    		getStudios,
    		getGenres,
    		getFormattedAnimeFormat,
    		itemScroll,
    		handlePopupContainerDown,
    		handlePopupContainerMove,
    		handlePopupContainerUp,
    		handlePopupContainerCancel,
    		load_handler,
    		error_handler,
    		div2_binding,
    		click_handler,
    		keydown_handler,
    		input_change_handler,
    		keydown_handler_1,
    		keydown_handler_2,
    		mouseenter_handler,
    		mouseenter_handler_1,
    		mouseenter_handler_2,
    		load_handler_1,
    		error_handler_1,
    		click_handler_1,
    		keydown_handler_3,
    		load_handler_2,
    		error_handler_2,
    		click_handler_2,
    		keydown_handler_4,
    		click_handler_3,
    		keydown_handler_5,
    		keydown_handler_6,
    		click_handler_4,
    		keydown_handler_7,
    		keydown_handler_8,
    		div15_binding,
    		div0_binding,
    		keydown_handler_9,
    		div1_binding,
    		error_handler_3,
    		click_handler_5,
    		keydown_handler_10,
    		pointerup_handler,
    		click_handler_6,
    		keydown_handler_11,
    		pointerup_handler_1
    	];
    }

    class AnimePopup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {}, null, [-1, -1, -1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AnimePopup",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\components\Anime\Fixed\AnimeOptionsPopup.svelte generated by Svelte v3.59.1 */

    const file$5 = "src\\components\\Anime\\Fixed\\AnimeOptionsPopup.svelte";

    // (145:0) {#if $animeOptionVisible}
    function create_if_block$4(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let span0;
    	let h1;
    	let t0;
    	let t1;
    	let div0;
    	let t3;
    	let span1;
    	let h20;
    	let t5;
    	let span2;
    	let h21;
    	let t7;
    	let span3;
    	let h22;
    	let t9;
    	let span4;
    	let h23;
    	let t11;
    	let span5;
    	let h24;

    	let t12_value = (/*$hiddenEntries*/ ctx[3][/*animeID*/ ctx[1]]
    	? "Show"
    	: "Hide") + " Anime" + "";

    	let t12;
    	let div2_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			h1 = element("h1");
    			t0 = text(/*animeTitle*/ ctx[0]);
    			t1 = space();
    			div0 = element("div");
    			div0.textContent = "×";
    			t3 = space();
    			span1 = element("span");
    			h20 = element("h2");
    			h20.textContent = "Information";
    			t5 = space();
    			span2 = element("span");
    			h21 = element("h2");
    			h21.textContent = "Open in Anilist";
    			t7 = space();
    			span3 = element("span");
    			h22 = element("h2");
    			h22.textContent = "Open in YouTube";
    			t9 = space();
    			span4 = element("span");
    			h23 = element("h2");
    			h23.textContent = "Copy Title";
    			t11 = space();
    			span5 = element("span");
    			h24 = element("h2");
    			t12 = text(t12_value);
    			attr_dev(h1, "class", "svelte-15qt3e2");
    			add_location(h1, file$5, 155, 42, 5371);
    			attr_dev(span0, "class", "anime-title svelte-15qt3e2");
    			add_location(span0, file$5, 155, 16, 5345);
    			attr_dev(div0, "class", "closing-x svelte-15qt3e2");
    			attr_dev(div0, "tabindex", "0");
    			add_location(div0, file$5, 157, 16, 5489);
    			attr_dev(div1, "class", "option-header svelte-15qt3e2");
    			add_location(div1, file$5, 154, 12, 5300);
    			attr_dev(h20, "class", "option-title svelte-15qt3e2");
    			add_location(h20, file$5, 171, 17, 6030);
    			attr_dev(span1, "class", "anime-option svelte-15qt3e2");
    			add_location(span1, file$5, 167, 12, 5849);
    			attr_dev(h21, "class", "option-title svelte-15qt3e2");
    			add_location(h21, file$5, 177, 17, 6285);
    			attr_dev(span2, "class", "anime-option svelte-15qt3e2");
    			add_location(span2, file$5, 173, 12, 6106);
    			attr_dev(h22, "class", "option-title svelte-15qt3e2");
    			add_location(h22, file$5, 183, 17, 6544);
    			attr_dev(span3, "class", "anime-option svelte-15qt3e2");
    			add_location(span3, file$5, 179, 12, 6365);
    			attr_dev(h23, "class", "option-title svelte-15qt3e2");
    			add_location(h23, file$5, 189, 17, 6795);
    			attr_dev(span4, "class", "anime-option svelte-15qt3e2");
    			add_location(span4, file$5, 185, 12, 6624);
    			attr_dev(h24, "class", "option-title svelte-15qt3e2");
    			add_location(h24, file$5, 195, 17, 7051);
    			attr_dev(span5, "class", "anime-option svelte-15qt3e2");
    			add_location(span5, file$5, 191, 12, 6870);
    			attr_dev(div2, "class", "anime-options-container svelte-15qt3e2");
    			add_location(div2, file$5, 150, 8, 5171);
    			attr_dev(div3, "class", "anime-options svelte-15qt3e2");
    			add_location(div3, file$5, 145, 4, 4990);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			append_dev(span0, h1);
    			append_dev(h1, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div2, t3);
    			append_dev(div2, span1);
    			append_dev(span1, h20);
    			append_dev(div2, t5);
    			append_dev(div2, span2);
    			append_dev(span2, h21);
    			append_dev(div2, t7);
    			append_dev(div2, span3);
    			append_dev(span3, h22);
    			append_dev(div2, t9);
    			append_dev(div2, span4);
    			append_dev(span4, h23);
    			append_dev(div2, t11);
    			append_dev(div2, span5);
    			append_dev(span5, h24);
    			append_dev(h24, t12);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*handleAnimeOptionVisibility*/ ctx[4], false, false, false, false),
    					listen_dev(div0, "keydown", /*keydown_handler*/ ctx[10], false, false, false, false),
    					listen_dev(span1, "click", /*openAnimePopup*/ ctx[5], false, false, false, false),
    					listen_dev(span1, "keydown", /*keydown_handler_1*/ ctx[11], false, false, false, false),
    					listen_dev(span2, "click", /*openInAnilist*/ ctx[6], false, false, false, false),
    					listen_dev(span2, "keydown", /*keydown_handler_2*/ ctx[12], false, false, false, false),
    					listen_dev(span3, "click", /*openInYoutube*/ ctx[7], false, false, false, false),
    					listen_dev(span3, "keydown", /*keydown_handler_3*/ ctx[13], false, false, false, false),
    					listen_dev(span4, "click", /*copyTitle*/ ctx[8], false, false, false, false),
    					listen_dev(span4, "keydown", /*keydown_handler_4*/ ctx[14], false, false, false, false),
    					listen_dev(span5, "click", /*handleHideShow*/ ctx[9], false, false, false, false),
    					listen_dev(span5, "keydown", /*keydown_handler_5*/ ctx[15], false, false, false, false),
    					listen_dev(div3, "click", /*handleAnimeOptionVisibility*/ ctx[4], false, false, false, false),
    					listen_dev(div3, "keydown", /*keydown_handler_6*/ ctx[16], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*animeTitle*/ 1) set_data_dev(t0, /*animeTitle*/ ctx[0]);

    			if ((!current || dirty & /*$hiddenEntries, animeID*/ 10) && t12_value !== (t12_value = (/*$hiddenEntries*/ ctx[3][/*animeID*/ ctx[1]]
    			? "Show"
    			: "Hide") + " Anime" + "")) set_data_dev(t12, t12_value);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fly, { y: 20, duration: 300 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fly, { y: 20, duration: 300 }, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (detaching && div2_transition) div2_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(145:0) {#if $animeOptionVisible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$animeOptionVisible*/ ctx[2] && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$animeOptionVisible*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$animeOptionVisible*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $animeOptionVisible;
    	let $animeLoaderWorker;
    	let $checkAnimeLoaderStatus;
    	let $finalAnimeList;
    	let $hiddenEntries;
    	let $confirmPromise;
    	let $android;
    	let $popupVisible;
    	let $openedAnimePopupIdx;
    	let $openedAnimeOptionIdx;
    	validate_store(animeOptionVisible, 'animeOptionVisible');
    	component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(2, $animeOptionVisible = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(22, $animeLoaderWorker = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(23, $checkAnimeLoaderStatus = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(24, $finalAnimeList = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(3, $hiddenEntries = $$value));
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(25, $confirmPromise = $$value));
    	validate_store(android, 'android');
    	component_subscribe($$self, android, $$value => $$invalidate(26, $android = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(27, $popupVisible = $$value));
    	validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
    	component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(28, $openedAnimePopupIdx = $$value));
    	validate_store(openedAnimeOptionIdx, 'openedAnimeOptionIdx');
    	component_subscribe($$self, openedAnimeOptionIdx, $$value => $$invalidate(29, $openedAnimeOptionIdx = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AnimeOptionsPopup', slots, []);
    	let animeTitle;
    	let youtubeSearchTitle;
    	let animeID;
    	let animeUrl;
    	let animeIdx;
    	let isRecentlyOpened = true, isRecentlyOpenedTimeout;

    	animeOptionVisible.subscribe(val => {
    		if (val === true) {
    			isRecentlyOpened = true;

    			isRecentlyOpenedTimeout = setTimeout(
    				() => {
    					isRecentlyOpened = false;
    				},
    				500
    			);

    			let openedAnime = $finalAnimeList[$openedAnimeOptionIdx];

    			if (openedAnime) {
    				$$invalidate(0, animeTitle = openedAnime?.title?.english || openedAnime?.title?.userPreferred || openedAnime?.title?.romaji || openedAnime?.title?.native);
    				youtubeSearchTitle = openedAnime?.title?.romaji || openedAnime?.title?.userPreferred || openedAnime?.title?.english || openedAnime?.title?.native;
    				$$invalidate(1, animeID = openedAnime.id);
    				animeUrl = openedAnime.animeUrl;
    				animeIdx = $openedAnimeOptionIdx;
    			}

    			set_store_value(openedAnimeOptionIdx, $openedAnimeOptionIdx = null, $openedAnimeOptionIdx);
    		} else {
    			if (isRecentlyOpenedTimeout) clearTimeout(isRecentlyOpenedTimeout);
    			isRecentlyOpened = false;
    		}
    	});

    	function handleAnimeOptionVisibility(e) {
    		if (isRecentlyOpened && e.type !== "keydown") return;
    		let target = e.target;
    		let classList = target.classList;
    		if (!classList.contains("closing-x") && (target.closest(".anime-options-container") || classList.contains("anime-options-container"))) return;
    		set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    	}

    	function openAnimePopup(e) {
    		if (isRecentlyOpened && e.type !== "keydown") return;
    		set_store_value(openedAnimePopupIdx, $openedAnimePopupIdx = animeIdx, $openedAnimePopupIdx);
    		set_store_value(popupVisible, $popupVisible = true, $popupVisible);
    		set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    	}

    	function openInAnilist(e) {
    		if (isRecentlyOpened && e.type !== "keydown") return;
    		if (typeof animeUrl !== "string" || animeUrl === "") return;
    		window.open(animeUrl, "_blank");
    	}

    	async function openInYoutube(e) {
    		if (isRecentlyOpened && e.type !== "keydown") return;
    		if (typeof youtubeSearchTitle !== "string" || youtubeSearchTitle === "") return;
    		window.open(`https://www.youtube.com/results?search_query=${youtubeSearchTitle} Anime`, "_blank");
    	}

    	function copyTitle(e) {
    		if (isRecentlyOpened && e.type !== "keydown" || !animeTitle) return;

    		if ($android) {
    			try {
    				JSBridge.copyToClipBoard(animeTitle);
    			} catch(ex) {
    				
    			}
    		} else {
    			navigator?.clipboard?.writeText?.(animeTitle);
    		}

    		set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    	}

    	async function handleHideShow(e) {
    		if (isRecentlyOpened && e.type !== "keydown") return;
    		let isHidden = $hiddenEntries[animeID];

    		if (isHidden) {
    			if (await $confirmPromise("Are you sure you want to show the anime?")) {
    				delete $hiddenEntries[animeID];
    				hiddenEntries.set($hiddenEntries);

    				if ($finalAnimeList.length) {
    					if ($animeLoaderWorker instanceof Worker) {
    						$checkAnimeLoaderStatus().then(() => {
    							$animeLoaderWorker.postMessage({ removeID: animeID });
    						});
    					}
    				}

    				set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    			}
    		} else {
    			if (await $confirmPromise("Are you sure you want to hide the anime?")) {
    				set_store_value(hiddenEntries, $hiddenEntries[animeID] = true, $hiddenEntries);

    				if ($finalAnimeList.length) {
    					if ($animeLoaderWorker instanceof Worker) {
    						$checkAnimeLoaderStatus().then(() => {
    							$animeLoaderWorker.postMessage({ removeID: animeID });
    						});
    					}
    				}

    				set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AnimeOptionsPopup> was created with unknown prop '${key}'`);
    	});

    	const keydown_handler = e => e.key === "Enter" && handleAnimeOptionVisibility(e);
    	const keydown_handler_1 = e => e.key === "Enter" && openAnimePopup(e);
    	const keydown_handler_2 = e => e.key === "Enter" && openInAnilist(e);
    	const keydown_handler_3 = e => e.key === "Enter" && openInYoutube(e);
    	const keydown_handler_4 = e => e.key === "Enter" && copyTitle(e);
    	const keydown_handler_5 = e => e.key === "Enter" && handleHideShow(e);
    	const keydown_handler_6 = e => e.key === "Enter" && handleAnimeOptionVisibility(e);

    	$$self.$capture_state = () => ({
    		fly,
    		android,
    		animeOptionVisible,
    		openedAnimeOptionIdx,
    		finalAnimeList,
    		popupVisible,
    		openedAnimePopupIdx,
    		hiddenEntries,
    		animeLoaderWorker: animeLoaderWorker$1,
    		confirmPromise,
    		checkAnimeLoaderStatus,
    		animeTitle,
    		youtubeSearchTitle,
    		animeID,
    		animeUrl,
    		animeIdx,
    		isRecentlyOpened,
    		isRecentlyOpenedTimeout,
    		handleAnimeOptionVisibility,
    		openAnimePopup,
    		openInAnilist,
    		openInYoutube,
    		copyTitle,
    		handleHideShow,
    		$animeOptionVisible,
    		$animeLoaderWorker,
    		$checkAnimeLoaderStatus,
    		$finalAnimeList,
    		$hiddenEntries,
    		$confirmPromise,
    		$android,
    		$popupVisible,
    		$openedAnimePopupIdx,
    		$openedAnimeOptionIdx
    	});

    	$$self.$inject_state = $$props => {
    		if ('animeTitle' in $$props) $$invalidate(0, animeTitle = $$props.animeTitle);
    		if ('youtubeSearchTitle' in $$props) youtubeSearchTitle = $$props.youtubeSearchTitle;
    		if ('animeID' in $$props) $$invalidate(1, animeID = $$props.animeID);
    		if ('animeUrl' in $$props) animeUrl = $$props.animeUrl;
    		if ('animeIdx' in $$props) animeIdx = $$props.animeIdx;
    		if ('isRecentlyOpened' in $$props) isRecentlyOpened = $$props.isRecentlyOpened;
    		if ('isRecentlyOpenedTimeout' in $$props) isRecentlyOpenedTimeout = $$props.isRecentlyOpenedTimeout;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		animeTitle,
    		animeID,
    		$animeOptionVisible,
    		$hiddenEntries,
    		handleAnimeOptionVisibility,
    		openAnimePopup,
    		openInAnilist,
    		openInYoutube,
    		copyTitle,
    		handleHideShow,
    		keydown_handler,
    		keydown_handler_1,
    		keydown_handler_2,
    		keydown_handler_3,
    		keydown_handler_4,
    		keydown_handler_5,
    		keydown_handler_6
    	];
    }

    class AnimeOptionsPopup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AnimeOptionsPopup",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\components\Fixed\Navigator.svelte generated by Svelte v3.59.1 */

    const { console: console_1$1 } = globals;
    const file$4 = "src\\components\\Fixed\\Navigator.svelte";

    function create_fragment$4(ctx) {
    	let div4;
    	let nav;
    	let div0;
    	let i;
    	let t0;
    	let div2;
    	let input;
    	let t1;
    	let div1;
    	let t2_value = (/*typedUsername*/ ctx[0] || "Your Anilist Username") + "";
    	let t2;
    	let t3;
    	let div3;
    	let img;
    	let img_src_value;
    	let nav_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			nav = element("nav");
    			div0 = element("div");
    			i = element("i");
    			t0 = space();
    			div2 = element("div");
    			input = element("input");
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div3 = element("div");
    			img = element("img");
    			attr_dev(i, "class", "" + (null_to_empty("goback fa-solid fa-arrow-left") + " svelte-qw8pe5"));
    			attr_dev(i, "tabindex", "0");
    			add_location(i, file$4, 311, 12, 11940);
    			attr_dev(div0, "class", "go-back-container svelte-qw8pe5");
    			add_location(div0, file$4, 310, 8, 11871);
    			attr_dev(input, "id", "usernameInput");
    			attr_dev(input, "type", "search");
    			attr_dev(input, "enterkeyhint", "search");
    			attr_dev(input, "autocomplete", "off");
    			attr_dev(input, "placeholder", "Your Anilist Username");
    			attr_dev(input, "class", "svelte-qw8pe5");
    			add_location(input, file$4, 318, 12, 12185);
    			attr_dev(div1, "class", "" + (null_to_empty("usernameText") + " svelte-qw8pe5"));
    			add_location(div1, file$4, 330, 12, 12684);
    			attr_dev(div2, "class", "input-search svelte-qw8pe5");
    			add_location(div2, file$4, 317, 8, 12145);
    			attr_dev(img, "class", "logo-icon svelte-qw8pe5");
    			if (!src_url_equal(img.src, img_src_value = "./images/Kanshi-Logo.webp")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Kanshi Logo");
    			attr_dev(img, "tabindex", "0");
    			attr_dev(img, "width", "30px");
    			attr_dev(img, "height", "30px");
    			add_location(img, file$4, 345, 12, 13237);
    			attr_dev(div3, "class", "logo-icon-container svelte-qw8pe5");
    			add_location(div3, file$4, 339, 8, 13044);
    			attr_dev(nav, "id", "nav");

    			attr_dev(nav, "class", nav_class_value = "" + (null_to_empty("nav " + (/*$popupVisible*/ ctx[3] || /*$menuVisible*/ ctx[4]
    			? "popupvisible"
    			: /*inputUsernameEl*/ ctx[1] === document?.activeElement
    				? "inputfocused"
    				: "")) + " svelte-qw8pe5"));

    			add_location(nav, file$4, 298, 4, 11451);
    			attr_dev(div4, "class", "nav-container svelte-qw8pe5");
    			add_location(div4, file$4, 293, 0, 11304);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, nav);
    			append_dev(nav, div0);
    			append_dev(div0, i);
    			append_dev(nav, t0);
    			append_dev(nav, div2);
    			append_dev(div2, input);
    			set_input_value(input, /*typedUsername*/ ctx[0]);
    			/*input_binding*/ ctx[15](input);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(nav, t3);
    			append_dev(nav, div3);
    			append_dev(div3, img);
    			/*nav_binding*/ ctx[18](nav);

    			if (!mounted) {
    				dispose = [
    					listen_dev(i, "keydown", /*keydown_handler*/ ctx[12], false, false, false, false),
    					listen_dev(div0, "click", /*handleGoBack*/ ctx[8], false, false, false, false),
    					listen_dev(input, "keydown", /*keydown_handler_1*/ ctx[13], false, false, false, false),
    					listen_dev(input, "focusin", /*onfocusUsernameInput*/ ctx[11], false, false, false, false),
    					listen_dev(input, "focusout", /*onfocusUsernameInput*/ ctx[11], false, false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[14]),
    					listen_dev(div1, "click", /*focusInputUsernameEl*/ ctx[7], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_2*/ ctx[16], false, false, false, false),
    					listen_dev(img, "keydown", stop_propagation(/*keydown_handler_3*/ ctx[17]), false, false, true, false),
    					listen_dev(div3, "pointerdown", /*handleGoUp*/ ctx[9], false, false, false, false),
    					listen_dev(div3, "pointerup", /*cancelGoUp*/ ctx[10], false, false, false, false),
    					listen_dev(div3, "pointercancel", /*cancelGoUp*/ ctx[10], false, false, false, false),
    					listen_dev(div4, "keydown", /*keydown_handler_4*/ ctx[19], false, false, false, false),
    					listen_dev(div4, "click", /*handleMenuVisibility*/ ctx[6], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*typedUsername*/ 1 && input.value !== /*typedUsername*/ ctx[0]) {
    				set_input_value(input, /*typedUsername*/ ctx[0]);
    			}

    			if (dirty[0] & /*typedUsername*/ 1 && t2_value !== (t2_value = (/*typedUsername*/ ctx[0] || "Your Anilist Username") + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*$popupVisible, $menuVisible, inputUsernameEl*/ 26 && nav_class_value !== (nav_class_value = "" + (null_to_empty("nav " + (/*$popupVisible*/ ctx[3] || /*$menuVisible*/ ctx[4]
    			? "popupvisible"
    			: /*inputUsernameEl*/ ctx[1] === document?.activeElement
    				? "inputfocused"
    				: "")) + " svelte-qw8pe5"))) {
    				attr_dev(nav, "class", nav_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			/*input_binding*/ ctx[15](null);
    			/*nav_binding*/ ctx[18](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $confirmPromise;
    	let $gridFullView;
    	let $popupVisible;
    	let $menuVisible;
    	let $dataStatus;
    	let $username;
    	let $userRequestIsRunning;
    	let $finalAnimeList;
    	let $initData;
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(25, $confirmPromise = $$value));
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(26, $gridFullView = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(3, $popupVisible = $$value));
    	validate_store(menuVisible, 'menuVisible');
    	component_subscribe($$self, menuVisible, $$value => $$invalidate(4, $menuVisible = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(27, $dataStatus = $$value));
    	validate_store(username, 'username');
    	component_subscribe($$self, username, $$value => $$invalidate(28, $username = $$value));
    	validate_store(userRequestIsRunning, 'userRequestIsRunning');
    	component_subscribe($$self, userRequestIsRunning, $$value => $$invalidate(29, $userRequestIsRunning = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(30, $finalAnimeList = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(31, $initData = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navigator', slots, []);
    	let writableSubscriptions = [];
    	let typedUsername = "";

    	let animeGridEl,
    		popupContainer,
    		navEl,
    		inputUsernameEl,
    		inputUsernameElFocused = false;

    	onMount(() => {
    		$$invalidate(2, navEl = navEl || document?.getElementById("nav"));
    		$$invalidate(1, inputUsernameEl = inputUsernameEl || document?.getElementById("usernameInput"));
    		animeGridEl = animeGridEl || document?.getElementById("anime-grid");
    		popupContainer = popupContainer || document?.getElementById("popup-container");

    		writableSubscriptions.push(username.subscribe(val => {
    			$$invalidate(0, typedUsername = val || "");
    		}));
    	});

    	async function updateUsername(event) {
    		if ($initData) {
    			await pleaseWaitAlert();
    			focusInputUsernameEl();
    			return;
    		}

    		let element = event.target;
    		let classList = element.classList;

    		if (event.key === "Enter" || event.type === "click" && (classList.contains("searchBtn") || element?.closest?.(".searchBtn"))) {
    			if (!typedUsername) return;

    			if (typedUsername !== $username) {
    				if (!navigator.onLine) {
    					return $confirmPromise({
    						isAlert: true,
    						title: "Currently Offline",
    						text: "It seems that you're currently offline and unable to update."
    					});
    				}

    				(async () => {
    					if ($username) {
    						if (await $confirmPromise(`Currently connected to ${$username}, do you want to change account?`)) {
    							set_store_value(menuVisible, $menuVisible = false, $menuVisible);

    							if (!$popupVisible) {
    								document.documentElement.style.overflow = "hidden";
    								document.documentElement.style.overflow = "";
    								window?.scrollTo?.({ top: -9999, behavior: "smooth" });
    								set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);
    							}

    							set_store_value(dataStatus, $dataStatus = "Getting User Entries", $dataStatus);
    							set_store_value(userRequestIsRunning, $userRequestIsRunning = true, $userRequestIsRunning);

    							requestUserEntries({ username: typedUsername }).then(({ newusername }) => {
    								set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);

    								if (newusername) {
    									setLocalStorage("username", newusername);
    									$$invalidate(0, typedUsername = set_store_value(username, $username = newusername || "", $username));
    									importantUpdate.update(e => !e);
    								}
    							}).catch(error => {
    								set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);
    								console.error(error);
    							});
    						} else {
    							focusInputUsernameEl();
    						}
    					} else {
    						if (await $confirmPromise(`Are you sure you want to connect to ${typedUsername}?`)) {
    							set_store_value(menuVisible, $menuVisible = false, $menuVisible);

    							if (!$popupVisible) {
    								document.documentElement.style.overflow = "hidden";
    								document.documentElement.style.overflow = "";
    								window?.scrollTo?.({ top: -9999, behavior: "smooth" });
    								set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);
    							}

    							set_store_value(dataStatus, $dataStatus = "Getting User Entries", $dataStatus);
    							set_store_value(userRequestIsRunning, $userRequestIsRunning = true, $userRequestIsRunning);

    							await requestUserEntries({ username: typedUsername }).then(({ newusername }) => {
    								set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);

    								if (newusername) {
    									setLocalStorage("username", newusername);
    									$$invalidate(0, typedUsername = set_store_value(username, $username = newusername || "", $username));
    								}

    								importantUpdate.update(e => !e);
    							}).catch(error => {
    								set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);
    								console.error(error);
    							});
    						} else {
    							focusInputUsernameEl();
    						}
    					}
    				})();
    			} else {
    				inputUsernameEl?.blur?.();
    				inputUsernameElFocused = false;
    			}
    		}
    	}

    	let goUpTimeout, goUpIsLongPressed;

    	function handleMenuVisibility(event) {
    		if (goUpIsLongPressed) {
    			goUpIsLongPressed = false;
    			return;
    		}

    		let element = event.target;
    		let classList = element.classList;
    		if (!classList.contains("nav") && !classList.contains("logo-icon")) return;

    		if (inputUsernameElFocused && !classList.contains("logo-icon")) {
    			inputUsernameEl?.blur?.();
    			inputUsernameElFocused = false;
    			return;
    		}

    		set_store_value(menuVisible, $menuVisible = !$menuVisible, $menuVisible);
    	}

    	async function focusInputUsernameEl() {
    		// if (
    		//     await $confirmPromise(
    		//         `Do you want to connect to your account in Anilist?`
    		//     )
    		// ) {
    		//     let webURL = window.location.href;
    		//     let clientID;
    		//     if (
    		//         webURL.startsWith(
    		//             "https://u-kuro.github.io/Kanshi.Anime-Recommendation"
    		//         )
    		//     ) {
    		//         clientID = "13583";
    		//     } else if (webURL.startsWith("file:///")) {
    		//         clientID = "13584";
    		//     } else if (webURL.startsWith("http://localhost:")) {
    		//         clientID = "12476";
    		//     } else if (webURL.startsWith("https://kanshi.vercel.app")) {
    		//         clientID = "13582";
    		//     }
    		//     if (clientID) {
    		//         window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientID}&response_type=token`;
    		//     } else {
    		//         inputUsernameEl?.focus?.();
    		//     }
    		// } else {
    		inputUsernameEl?.focus?.();
    	} // }

    	function handleGoBack() {
    		if (inputUsernameEl === document.activeElement || inputUsernameElFocused) {
    			inputUsernameEl?.blur?.();
    			inputUsernameElFocused = false;
    		} else if ($menuVisible) {
    			set_store_value(menuVisible, $menuVisible = !$menuVisible, $menuVisible);
    		} else if ($popupVisible) {
    			set_store_value(popupVisible, $popupVisible = false, $popupVisible);
    		}
    	}

    	function handleGoUp() {
    		if (goUpTimeout) clearTimeout(goUpTimeout);

    		goUpTimeout = setTimeout(
    			() => {
    				goUpIsLongPressed = true;

    				if ($popupVisible) {
    					popupContainer.style.overflow = "hidden";
    					popupContainer.style.overflow = "";

    					popupContainer?.children?.[0]?.scrollIntoView?.({
    						container: popupContainer,
    						behavior: "smooth",
    						block: "start",
    						inline: "nearest"
    					});
    				} else {
    					if ($gridFullView) {
    						animeGridEl.style.overflow = "hidden";
    						animeGridEl.style.overflow = "";

    						animeGridEl?.children?.[0]?.scrollIntoView?.({
    							container: animeGridEl,
    							behavior: "smooth",
    							block: "nearest",
    							inline: "start"
    						});
    					} else {
    						document.documentElement.style.overflow = "hidden";
    						document.documentElement.style.overflow = "";
    						window.scrollTo({ top: -9999, behavior: "smooth" });
    					}
    				}
    			},
    			500
    		);
    	}

    	function cancelGoUp() {
    		if (goUpTimeout) clearTimeout(goUpTimeout);

    		if (goUpIsLongPressed) {
    			goUpTimeout = setTimeout(
    				() => {
    					goUpIsLongPressed = false;
    				},
    				50
    			);
    		}
    	}

    	onDestroy(() => {
    		writableSubscriptions.forEach(unsub => unsub());
    	});

    	async function pleaseWaitAlert() {
    		return await $confirmPromise({
    			isAlert: true,
    			title: "Initializing resources",
    			text: "Please wait a moment..."
    		});
    	}

    	function onfocusUsernameInput(event) {
    		if (event.type === "focusin") {
    			inputUsernameElFocused = true;
    			addClass(navEl, "inputfocused");
    		} else {
    			setTimeout(
    				() => {
    					removeClass(navEl, "inputfocused");
    					inputUsernameElFocused = false;
    				},
    				100
    			);
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Navigator> was created with unknown prop '${key}'`);
    	});

    	const keydown_handler = e => e.key === "Enter" && handleGoBack();
    	const keydown_handler_1 = e => e.key === "Enter" && updateUsername(e);

    	function input_input_handler() {
    		typedUsername = this.value;
    		$$invalidate(0, typedUsername);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			inputUsernameEl = $$value;
    			$$invalidate(1, inputUsernameEl);
    		});
    	}

    	const keydown_handler_2 = e => e.key === "Enter" && focusInputUsernameEl();
    	const keydown_handler_3 = e => e.key === "Enter" && set_store_value(menuVisible, $menuVisible = !$menuVisible, $menuVisible);

    	function nav_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			navEl = $$value;
    			$$invalidate(2, navEl);
    		});
    	}

    	const keydown_handler_4 = e => e.key === "Enter" && handleMenuVisibility(e);

    	$$self.$capture_state = () => ({
    		username,
    		dataStatus,
    		menuVisible,
    		initData,
    		importantUpdate,
    		confirmPromise,
    		popupVisible,
    		finalAnimeList,
    		gridFullView,
    		userRequestIsRunning,
    		addClass,
    		removeClass,
    		setLocalStorage,
    		requestUserEntries,
    		onMount,
    		onDestroy,
    		writableSubscriptions,
    		typedUsername,
    		animeGridEl,
    		popupContainer,
    		navEl,
    		inputUsernameEl,
    		inputUsernameElFocused,
    		updateUsername,
    		goUpTimeout,
    		goUpIsLongPressed,
    		handleMenuVisibility,
    		focusInputUsernameEl,
    		handleGoBack,
    		handleGoUp,
    		cancelGoUp,
    		pleaseWaitAlert,
    		onfocusUsernameInput,
    		$confirmPromise,
    		$gridFullView,
    		$popupVisible,
    		$menuVisible,
    		$dataStatus,
    		$username,
    		$userRequestIsRunning,
    		$finalAnimeList,
    		$initData
    	});

    	$$self.$inject_state = $$props => {
    		if ('writableSubscriptions' in $$props) writableSubscriptions = $$props.writableSubscriptions;
    		if ('typedUsername' in $$props) $$invalidate(0, typedUsername = $$props.typedUsername);
    		if ('animeGridEl' in $$props) animeGridEl = $$props.animeGridEl;
    		if ('popupContainer' in $$props) popupContainer = $$props.popupContainer;
    		if ('navEl' in $$props) $$invalidate(2, navEl = $$props.navEl);
    		if ('inputUsernameEl' in $$props) $$invalidate(1, inputUsernameEl = $$props.inputUsernameEl);
    		if ('inputUsernameElFocused' in $$props) inputUsernameElFocused = $$props.inputUsernameElFocused;
    		if ('goUpTimeout' in $$props) goUpTimeout = $$props.goUpTimeout;
    		if ('goUpIsLongPressed' in $$props) goUpIsLongPressed = $$props.goUpIsLongPressed;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*typedUsername, inputUsernameEl*/ 3) {
    			((() => {
    				if (typedUsername) {
    					inputUsernameEl?.setCustomValidity?.("");
    				}
    			})());
    		}
    	};

    	return [
    		typedUsername,
    		inputUsernameEl,
    		navEl,
    		$popupVisible,
    		$menuVisible,
    		updateUsername,
    		handleMenuVisibility,
    		focusInputUsernameEl,
    		handleGoBack,
    		handleGoUp,
    		cancelGoUp,
    		onfocusUsernameInput,
    		keydown_handler,
    		keydown_handler_1,
    		input_input_handler,
    		input_binding,
    		keydown_handler_2,
    		keydown_handler_3,
    		nav_binding,
    		keydown_handler_4
    	];
    }

    class Navigator extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navigator",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\Fixed\Menu.svelte generated by Svelte v3.59.1 */
    const file$3 = "src\\components\\Fixed\\Menu.svelte";

    // (304:0) {#if $menuVisible}
    function create_if_block$3(ctx) {
    	let div1;
    	let div0;
    	let button0;
    	let button0_transition;
    	let t1;
    	let button1;
    	let button1_transition;
    	let t3;
    	let button2;
    	let button2_transition;
    	let t5;
    	let button3;
    	let button3_transition;
    	let t7;
    	let t8;
    	let button4;
    	let t9;
    	let button4_class_value;
    	let button4_transition;
    	let t10;
    	let t11;
    	let button5;
    	let button5_transition;
    	let t13;
    	let t14;
    	let button6;
    	let button6_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$android*/ ctx[1] && create_if_block_4$1(ctx);
    	let if_block1 = /*$android*/ ctx[1] && create_if_block_3$1(ctx);
    	let if_block2 = /*$android*/ ctx[1] && create_if_block_1$3(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Update List";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Show All Hidden Entries";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "Import Data";
    			t5 = space();
    			button3 = element("button");
    			button3.textContent = "Export Data";
    			t7 = space();
    			if (if_block0) if_block0.c();
    			t8 = space();
    			button4 = element("button");
    			t9 = text("Auto Update");
    			t10 = space();
    			if (if_block1) if_block1.c();
    			t11 = space();
    			button5 = element("button");
    			button5.textContent = "Create an Anilist Account";
    			t13 = space();
    			if (if_block2) if_block2.c();
    			t14 = space();
    			button6 = element("button");
    			button6.textContent = "Reload";
    			attr_dev(button0, "class", "button svelte-1kir51");
    			add_location(button0, file$3, 310, 12, 10244);
    			attr_dev(button1, "class", "button svelte-1kir51");
    			add_location(button1, file$3, 316, 12, 10502);
    			attr_dev(button2, "class", "button svelte-1kir51");
    			add_location(button2, file$3, 323, 12, 10810);
    			attr_dev(button3, "class", "button svelte-1kir51");
    			add_location(button3, file$3, 329, 12, 11068);
    			attr_dev(button4, "class", button4_class_value = "" + (null_to_empty("button " + (/*$autoUpdate*/ ctx[5] ? "selected" : "")) + " svelte-1kir51"));
    			add_location(button4, file$3, 347, 12, 11814);
    			attr_dev(button5, "class", "button svelte-1kir51");
    			add_location(button5, file$3, 365, 12, 12605);
    			attr_dev(button6, "class", "button svelte-1kir51");
    			add_location(button6, file$3, 412, 12, 14661);
    			attr_dev(div0, "class", "menu svelte-1kir51");
    			add_location(div0, file$3, 309, 8, 10212);
    			attr_dev(div1, "class", "menu-container svelte-1kir51");
    			add_location(div1, file$3, 304, 4, 10044);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t1);
    			append_dev(div0, button1);
    			append_dev(div0, t3);
    			append_dev(div0, button2);
    			append_dev(div0, t5);
    			append_dev(div0, button3);
    			append_dev(div0, t7);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t8);
    			append_dev(div0, button4);
    			append_dev(button4, t9);
    			append_dev(div0, t10);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div0, t11);
    			append_dev(div0, button5);
    			append_dev(div0, t13);
    			if (if_block2) if_block2.m(div0, null);
    			append_dev(div0, t14);
    			append_dev(div0, button6);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*updateList*/ ctx[9], false, false, false, false),
    					listen_dev(button0, "keydown", /*keydown_handler*/ ctx[22], false, false, false, false),
    					listen_dev(button1, "click", /*showAllHiddenEntries*/ ctx[13], false, false, false, false),
    					listen_dev(button1, "keydown", /*keydown_handler_1*/ ctx[23], false, false, false, false),
    					listen_dev(button2, "click", /*importData*/ ctx[6], false, false, false, false),
    					listen_dev(button2, "keydown", /*keydown_handler_2*/ ctx[24], false, false, false, false),
    					listen_dev(button3, "click", /*exportData*/ ctx[8], false, false, false, false),
    					listen_dev(button3, "keydown", /*keydown_handler_3*/ ctx[25], false, false, false, false),
    					listen_dev(button4, "click", /*handleUpdateEveryHour*/ ctx[10], false, false, false, false),
    					listen_dev(button4, "keydown", /*keydown_handler_5*/ ctx[27], false, false, false, false),
    					listen_dev(button5, "click", /*anilistSignup*/ ctx[14], false, false, false, false),
    					listen_dev(button5, "keydown", /*keydown_handler_7*/ ctx[29], false, false, false, false),
    					listen_dev(button6, "keydown", /*keydown_handler_13*/ ctx[35], false, false, false, false),
    					listen_dev(button6, "click", /*reload*/ ctx[18], false, false, false, false),
    					listen_dev(div1, "click", /*handleMenuVisibility*/ ctx[12], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_14*/ ctx[36], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*$android*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*$android*/ 2) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_4$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div0, t8);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*$autoUpdate*/ 32 && button4_class_value !== (button4_class_value = "" + (null_to_empty("button " + (/*$autoUpdate*/ ctx[5] ? "selected" : "")) + " svelte-1kir51"))) {
    				attr_dev(button4, "class", button4_class_value);
    			}

    			if (/*$android*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$android*/ 2) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_3$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div0, t11);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*$android*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*$android*/ 2) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_1$3(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div0, t14);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button0_transition) button0_transition = create_bidirectional_transition(button0, fly, { x: 50, duration: 300 }, true);
    				button0_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button1_transition) button1_transition = create_bidirectional_transition(button1, fly, { x: 50, duration: 300 }, true);
    				button1_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button2_transition) button2_transition = create_bidirectional_transition(button2, fly, { x: 50, duration: 300 }, true);
    				button2_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button3_transition) button3_transition = create_bidirectional_transition(button3, fly, { x: 50, duration: 300 }, true);
    				button3_transition.run(1);
    			});

    			transition_in(if_block0);

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button4_transition) button4_transition = create_bidirectional_transition(button4, fly, { x: 50, duration: 300 }, true);
    				button4_transition.run(1);
    			});

    			transition_in(if_block1);

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button5_transition) button5_transition = create_bidirectional_transition(button5, fly, { x: 50, duration: 300 }, true);
    				button5_transition.run(1);
    			});

    			transition_in(if_block2);

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button6_transition) button6_transition = create_bidirectional_transition(button6, fly, { x: 50, duration: 300 }, true);
    				button6_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!button0_transition) button0_transition = create_bidirectional_transition(button0, fly, { x: 50, duration: 300 }, false);
    			button0_transition.run(0);
    			if (!button1_transition) button1_transition = create_bidirectional_transition(button1, fly, { x: 50, duration: 300 }, false);
    			button1_transition.run(0);
    			if (!button2_transition) button2_transition = create_bidirectional_transition(button2, fly, { x: 50, duration: 300 }, false);
    			button2_transition.run(0);
    			if (!button3_transition) button3_transition = create_bidirectional_transition(button3, fly, { x: 50, duration: 300 }, false);
    			button3_transition.run(0);
    			transition_out(if_block0);
    			if (!button4_transition) button4_transition = create_bidirectional_transition(button4, fly, { x: 50, duration: 300 }, false);
    			button4_transition.run(0);
    			transition_out(if_block1);
    			if (!button5_transition) button5_transition = create_bidirectional_transition(button5, fly, { x: 50, duration: 300 }, false);
    			button5_transition.run(0);
    			transition_out(if_block2);
    			if (!button6_transition) button6_transition = create_bidirectional_transition(button6, fly, { x: 50, duration: 300 }, false);
    			button6_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching && button0_transition) button0_transition.end();
    			if (detaching && button1_transition) button1_transition.end();
    			if (detaching && button2_transition) button2_transition.end();
    			if (detaching && button3_transition) button3_transition.end();
    			if (if_block0) if_block0.d();
    			if (detaching && button4_transition) button4_transition.end();
    			if (if_block1) if_block1.d();
    			if (detaching && button5_transition) button5_transition.end();
    			if (if_block2) if_block2.d();
    			if (detaching && button6_transition) button6_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(304:0) {#if $menuVisible}",
    		ctx
    	});

    	return block;
    }

    // (336:12) {#if $android}
    function create_if_block_4$1(ctx) {
    	let button;
    	let t_value = (/*$exportPathIsAvailable*/ ctx[4] ? "Change" : "Set") + " Export Folder" + "";
    	let t;
    	let button_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "button svelte-1kir51");
    			add_location(button, file$3, 336, 16, 11358);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", handleExportFolder, false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler_4*/ ctx[26], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[0] & /*$exportPathIsAvailable*/ 16) && t_value !== (t_value = (/*$exportPathIsAvailable*/ ctx[4] ? "Change" : "Set") + " Export Folder" + "")) set_data_dev(t, t_value);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button_transition) button_transition = create_bidirectional_transition(button, fly, { x: 50, duration: 300 }, true);
    				button_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!button_transition) button_transition = create_bidirectional_transition(button, fly, { x: 50, duration: 300 }, false);
    			button_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching && button_transition) button_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(336:12) {#if $android}",
    		ctx
    	});

    	return block;
    }

    // (356:12) {#if $android}
    function create_if_block_3$1(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let button_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Auto Export");
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty("button " + (/*$autoExport*/ ctx[3] ? "selected" : "")) + " svelte-1kir51"));
    			add_location(button, file$3, 356, 16, 12202);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*handleExportEveryHour*/ ctx[11], false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler_6*/ ctx[28], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*$autoExport*/ 8 && button_class_value !== (button_class_value = "" + (null_to_empty("button " + (/*$autoExport*/ ctx[3] ? "selected" : "")) + " svelte-1kir51"))) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button_transition) button_transition = create_bidirectional_transition(button, fly, { x: 50, duration: 300 }, true);
    				button_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!button_transition) button_transition = create_bidirectional_transition(button, fly, { x: 50, duration: 300 }, false);
    			button_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching && button_transition) button_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(356:12) {#if $android}",
    		ctx
    	});

    	return block;
    }

    // (373:12) {#if $android}
    function create_if_block_1$3(ctx) {
    	let button0;
    	let button0_transition;
    	let t1;
    	let show_if = !window.location.protocol.startsWith("file:");
    	let t2;
    	let button1;
    	let button1_transition;
    	let t4;
    	let button2;
    	let button2_transition;
    	let t6;
    	let button3;
    	let button3_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = show_if && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Show Recent Releases";
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Switch App Mode";
    			t4 = space();
    			button2 = element("button");
    			button2.textContent = "Clear Cache";
    			t6 = space();
    			button3 = element("button");
    			button3.textContent = "Refresh";
    			attr_dev(button0, "class", "button svelte-1kir51");
    			add_location(button0, file$3, 373, 16, 12933);
    			attr_dev(button1, "class", "button svelte-1kir51");
    			add_location(button1, file$3, 391, 16, 13756);
    			attr_dev(button2, "class", "button svelte-1kir51");
    			add_location(button2, file$3, 398, 16, 14070);
    			attr_dev(button3, "class", "button svelte-1kir51");
    			add_location(button3, file$3, 405, 16, 14374);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, button2, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, button3, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "keydown", /*keydown_handler_8*/ ctx[30], false, false, false, false),
    					listen_dev(button0, "click", /*showRecentReleases*/ ctx[15], false, false, false, false),
    					listen_dev(button1, "keydown", /*keydown_handler_10*/ ctx[32], false, false, false, false),
    					listen_dev(button1, "click", /*switchAppMode*/ ctx[16], false, false, false, false),
    					listen_dev(button2, "keydown", /*keydown_handler_11*/ ctx[33], false, false, false, false),
    					listen_dev(button2, "click", /*clearCache*/ ctx[20], false, false, false, false),
    					listen_dev(button3, "keydown", /*keydown_handler_12*/ ctx[34], false, false, false, false),
    					listen_dev(button3, "click", /*refresh*/ ctx[19], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (show_if) if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button0_transition) button0_transition = create_bidirectional_transition(button0, fly, { x: 50, duration: 300 }, true);
    				button0_transition.run(1);
    			});

    			transition_in(if_block);

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button1_transition) button1_transition = create_bidirectional_transition(button1, fly, { x: 50, duration: 300 }, true);
    				button1_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button2_transition) button2_transition = create_bidirectional_transition(button2, fly, { x: 50, duration: 300 }, true);
    				button2_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button3_transition) button3_transition = create_bidirectional_transition(button3, fly, { x: 50, duration: 300 }, true);
    				button3_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!button0_transition) button0_transition = create_bidirectional_transition(button0, fly, { x: 50, duration: 300 }, false);
    			button0_transition.run(0);
    			transition_out(if_block);
    			if (!button1_transition) button1_transition = create_bidirectional_transition(button1, fly, { x: 50, duration: 300 }, false);
    			button1_transition.run(0);
    			if (!button2_transition) button2_transition = create_bidirectional_transition(button2, fly, { x: 50, duration: 300 }, false);
    			button2_transition.run(0);
    			if (!button3_transition) button3_transition = create_bidirectional_transition(button3, fly, { x: 50, duration: 300 }, false);
    			button3_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching && button0_transition) button0_transition.end();
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(button1);
    			if (detaching && button1_transition) button1_transition.end();
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(button2);
    			if (detaching && button2_transition) button2_transition.end();
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(button3);
    			if (detaching && button3_transition) button3_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(373:12) {#if $android}",
    		ctx
    	});

    	return block;
    }

    // (382:16) {#if !window.location.protocol.startsWith("file:")}
    function create_if_block_2$1(ctx) {
    	let button;
    	let button_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Check for Updates";
    			attr_dev(button, "class", "button svelte-1kir51");
    			add_location(button, file$3, 382, 20, 13360);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "keydown", /*keydown_handler_9*/ ctx[31], false, false, false, false),
    					listen_dev(button, "click", /*checkForUpdates*/ ctx[17], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!button_transition) button_transition = create_bidirectional_transition(button, fly, { x: 50, duration: 300 }, true);
    				button_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!button_transition) button_transition = create_bidirectional_transition(button, fly, { x: 50, duration: 300 }, false);
    			button_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching && button_transition) button_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(382:16) {#if !window.location.protocol.startsWith(\\\"file:\\\")}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let input;
    	let t;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*$menuVisible*/ ctx[2] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			input = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".json");
    			set_style(input, "display", `none`);
    			add_location(input, file$3, 296, 0, 9880);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[21](input);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*importJSONFile*/ ctx[7], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*$menuVisible*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*$menuVisible*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[21](null);
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function handleExportFolder() {
    	try {
    		JSBridge.chooseExportFolder();
    	} catch(e) {
    		
    	}
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $confirmPromise;
    	let $android;
    	let $appID;
    	let $activeTagFilters;
    	let $filterOptions;
    	let $menuVisible;
    	let $dataStatus;
    	let $finalAnimeList;
    	let $popupVisible;
    	let $animeLoaderWorker;
    	let $hiddenEntries;
    	let $initData;
    	let $autoExport;
    	let $exportPathIsAvailable;
    	let $autoUpdate;
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(37, $confirmPromise = $$value));
    	validate_store(android, 'android');
    	component_subscribe($$self, android, $$value => $$invalidate(1, $android = $$value));
    	validate_store(appID, 'appID');
    	component_subscribe($$self, appID, $$value => $$invalidate(38, $appID = $$value));
    	validate_store(activeTagFilters, 'activeTagFilters');
    	component_subscribe($$self, activeTagFilters, $$value => $$invalidate(39, $activeTagFilters = $$value));
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(40, $filterOptions = $$value));
    	validate_store(menuVisible, 'menuVisible');
    	component_subscribe($$self, menuVisible, $$value => $$invalidate(2, $menuVisible = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(41, $dataStatus = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(42, $finalAnimeList = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(43, $popupVisible = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(44, $animeLoaderWorker = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(45, $hiddenEntries = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(46, $initData = $$value));
    	validate_store(autoExport, 'autoExport');
    	component_subscribe($$self, autoExport, $$value => $$invalidate(3, $autoExport = $$value));
    	validate_store(exportPathIsAvailable, 'exportPathIsAvailable');
    	component_subscribe($$self, exportPathIsAvailable, $$value => $$invalidate(4, $exportPathIsAvailable = $$value));
    	validate_store(autoUpdate, 'autoUpdate');
    	component_subscribe($$self, autoUpdate, $$value => $$invalidate(5, $autoUpdate = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Menu', slots, []);
    	let importFileInput;

    	async function importData() {
    		if ($initData) return pleaseWaitAlert();
    		if (!(importFileInput instanceof Element)) return set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);

    		if (await $confirmPromise({
    			text: "Are you sure you want to import your Data?"
    		})) {
    			importFileInput.click();
    		}
    	}

    	async function importJSONFile() {
    		if (!(importFileInput instanceof Element)) return set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);
    		let importedFile = importFileInput.files?.[0];

    		if (importedFile) {
    			let filename = importedFile.name;

    			if (await $confirmPromise(`File ${filename ? "named [" + filename + "] " : ""}has been detected, do you want to continue the import?`)) {
    				await saveJSON(true, "shouldProcessRecommendation");
    				set_store_value(menuVisible, $menuVisible = false, $menuVisible);

    				if (!$popupVisible) {
    					document.documentElement.style.overflow = "hidden";
    					document.documentElement.style.overflow = "";
    					window?.scrollTo?.({ top: -9999, behavior: "smooth" });
    					set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);
    				}

    				importUserData({ importedFile }).then(() => {
    					if (importFileInput instanceof Element) $$invalidate(0, importFileInput.value = null, importFileInput);
    				}).catch(error => {
    					set_store_value(dataStatus, $dataStatus = error || "Something went wrong...", $dataStatus);
    					$$invalidate(0, importFileInput.value = null, importFileInput);
    					importantUpdate.update(e => !e);
    				});
    			} else {
    				if (importFileInput instanceof Element) $$invalidate(0, importFileInput.value = null, importFileInput);
    			}
    		} else {
    			if (importFileInput instanceof Element) $$invalidate(0, importFileInput.value = null, importFileInput);
    		}
    	}

    	window.setExportPathAvailability = async (value = true) => {
    		set_store_value(exportPathIsAvailable, $exportPathIsAvailable = value, $exportPathIsAvailable);
    		setLocalStorage("exportPathIsAvailable", value);
    		await saveJSON(value, "exportPathIsAvailable");
    	};

    	async function exportData() {
    		if ($initData) return pleaseWaitAlert();
    		if (!$exportPathIsAvailable && $android) return handleExportFolder();

    		if (await $confirmPromise("Are you sure you want to export your data?")) {
    			set_store_value(menuVisible, $menuVisible = false, $menuVisible);
    			runExport.update(e => !e);
    		}
    	}

    	async function updateList() {
    		if ($initData) return pleaseWaitAlert(); else if (!navigator.onLine) {
    			return $confirmPromise({
    				isAlert: true,
    				title: "Currently offline",
    				text: "It seems that you're currently offline and unable to update."
    			});
    		}

    		if (await $confirmPromise("Are you sure you want to update your list?")) {
    			set_store_value(menuVisible, $menuVisible = false, $menuVisible);
    			runUpdate.update(e => !e);
    		}
    	}

    	async function handleUpdateEveryHour() {
    		if (await $confirmPromise(`Are you sure you want to ${$autoUpdate ? "disable" : "enable"} auto-update?`)) {
    			set_store_value(autoUpdate, $autoUpdate = !$autoUpdate, $autoUpdate);
    		}
    	}

    	async function handleExportEveryHour() {
    		if (!$exportPathIsAvailable && $android) return handleExportFolder();

    		if (await $confirmPromise(`Are you sure you want to ${$autoExport ? "disable" : "enable"} auto-export?`)) {
    			set_store_value(autoExport, $autoExport = !$autoExport, $autoExport);
    		}
    	}

    	function handleMenuVisibility(event) {
    		let element = event.target;
    		let classList = element.classList;
    		if (classList.contains("button")) return;
    		set_store_value(menuVisible, $menuVisible = !$menuVisible, $menuVisible);
    	}

    	async function showAllHiddenEntries() {
    		if ($initData) return pleaseWaitAlert();

    		if (jsonIsEmpty($hiddenEntries)) {
    			// Alert No Hidden Entries
    			$confirmPromise({
    				isAlert: true,
    				text: "There is currently no hidden entries."
    			});

    			return;
    		} else if (await $confirmPromise("Are you sure you want to show all hidden anime entries?")) {
    			if ($animeLoaderWorker) {
    				$animeLoaderWorker.terminate();
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    			}

    			if (!$popupVisible) {
    				set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);
    			}

    			set_store_value(dataStatus, $dataStatus = "Updating List", $dataStatus);
    			set_store_value(menuVisible, $menuVisible = false, $menuVisible);
    			let filterSelectionIdx = $filterOptions?.filterSelection?.findIndex?.(({ filterSelectionName }) => filterSelectionName === "Anime Filter");
    			let checkBoxFilterIdx = $filterOptions?.filterSelection?.[filterSelectionIdx ?? -1]?.filters?.Checkbox?.findIndex?.(({ filName }) => filName === "hidden anime");

    			if (filterSelectionIdx >= 0 && checkBoxFilterIdx >= 0) {
    				set_store_value(filterOptions, $filterOptions.filterSelection[filterSelectionIdx ?? -1].filters.Checkbox[checkBoxFilterIdx ?? -1].isSelected = false, $filterOptions);
    			}

    			if ($activeTagFilters?.["Anime Filter"]) {
    				set_store_value(activeTagFilters, $activeTagFilters["Anime Filter"] = $activeTagFilters["Anime Filter"].filter(({ optionName, filterType }) => optionName !== "hidden" && filterType !== "checkbox"), $activeTagFilters);
    			}

    			await saveJSON($filterOptions, "filterOptions");
    			await saveJSON($activeTagFilters, "activeTagFilters");
    			await saveJSON({}, "hiddenEntries");
    			importantLoad.update(e => !e);
    		}
    	}

    	async function anilistSignup() {
    		if (await $confirmPromise("Are you sure want to sign-up an anilist account?")) {
    			window.open("https://anilist.co/signup", "_blank");
    		}
    	}

    	function showRecentReleases() {
    		if (!$android) return;

    		try {
    			JSBridge.showRecentReleases();
    		} catch(e) {
    			
    		}
    	}

    	function switchAppMode() {
    		if (!$android) return;

    		try {
    			JSBridge.switchApp();
    		} catch(e) {
    			
    		}
    	}

    	function checkForUpdates() {
    		if (!navigator.onLine) {
    			return $confirmPromise({
    				isAlert: true,
    				title: "Currently offline",
    				text: "It seems that you're currently offline and unable to check for updates."
    			});
    		} else {
    			if (!$android) return;

    			try {
    				JSBridge.checkAppID($appID, true);
    			} catch(e) {
    				
    			}
    		}
    	}

    	async function reload() {
    		if (await $confirmPromise("Are you sure want to reload the resources?")) {
    			document.querySelectorAll("script")?.forEach(script => {
    				if (script.src && script.src !== "https://www.youtube.com/iframe_api?v=16") {
    					script.src = script.src;
    				}
    			});

    			document.querySelectorAll("img")?.forEach(image => {
    				if (!image.naturalHeight) {
    					image.src = image.src;
    				}
    			});

    			window.reloadYoutube?.();
    		}
    	}

    	async function refresh() {
    		if (!$android) return;

    		if (await $confirmPromise("Are you sure want to refresh the app?")) {
    			try {
    				JSBridge.refreshWeb();
    			} catch(e) {
    				
    			}
    		}
    	}

    	async function clearCache() {
    		if (!$android) return;

    		if (await $confirmPromise("Are you sure want to clear the cache?")) {
    			try {
    				JSBridge.clearCache();
    			} catch(e) {
    				
    			}
    		}
    	}

    	function pleaseWaitAlert() {
    		$confirmPromise({
    			isAlert: true,
    			title: "Initializing resources",
    			text: "Please wait a moment..."
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Menu> was created with unknown prop '${key}'`);
    	});

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			importFileInput = $$value;
    			$$invalidate(0, importFileInput);
    		});
    	}

    	const keydown_handler = e => e.key === "Enter" && updateList();
    	const keydown_handler_1 = e => e.key === "Enter" && showAllHiddenEntries();
    	const keydown_handler_2 = e => e.key === "Enter" && importData();
    	const keydown_handler_3 = e => e.key === "Enter" && exportData();
    	const keydown_handler_4 = e => e.key === "Enter" && handleExportFolder();
    	const keydown_handler_5 = e => e.key === "Enter" && handleUpdateEveryHour();
    	const keydown_handler_6 = e => e.key === "Enter" && handleExportEveryHour();
    	const keydown_handler_7 = e => e.key === "Enter" && anilistSignup();
    	const keydown_handler_8 = e => e.key === "Enter" && showRecentReleases();
    	const keydown_handler_9 = e => e.key === "Enter" && checkForUpdates();
    	const keydown_handler_10 = e => e.key === "Enter" && switchAppMode();
    	const keydown_handler_11 = e => e.key === "Enter" && clearCache();
    	const keydown_handler_12 = e => e.key === "Enter" && refresh();
    	const keydown_handler_13 = e => e.key === "Enter" && reload();
    	const keydown_handler_14 = e => e.key === "Enter" && handleMenuVisibility(e);

    	$$self.$capture_state = () => ({
    		appID,
    		android,
    		menuVisible,
    		hiddenEntries,
    		animeLoaderWorker: animeLoaderWorker$1,
    		finalAnimeList,
    		dataStatus,
    		autoUpdate,
    		autoExport,
    		exportPathIsAvailable,
    		filterOptions,
    		activeTagFilters,
    		runUpdate,
    		runExport,
    		confirmPromise,
    		initData,
    		importantUpdate,
    		importantLoad,
    		popupVisible,
    		fly,
    		saveJSON,
    		importUserData,
    		jsonIsEmpty,
    		setLocalStorage,
    		importFileInput,
    		importData,
    		importJSONFile,
    		handleExportFolder,
    		exportData,
    		updateList,
    		handleUpdateEveryHour,
    		handleExportEveryHour,
    		handleMenuVisibility,
    		showAllHiddenEntries,
    		anilistSignup,
    		showRecentReleases,
    		switchAppMode,
    		checkForUpdates,
    		reload,
    		refresh,
    		clearCache,
    		pleaseWaitAlert,
    		$confirmPromise,
    		$android,
    		$appID,
    		$activeTagFilters,
    		$filterOptions,
    		$menuVisible,
    		$dataStatus,
    		$finalAnimeList,
    		$popupVisible,
    		$animeLoaderWorker,
    		$hiddenEntries,
    		$initData,
    		$autoExport,
    		$exportPathIsAvailable,
    		$autoUpdate
    	});

    	$$self.$inject_state = $$props => {
    		if ('importFileInput' in $$props) $$invalidate(0, importFileInput = $$props.importFileInput);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		importFileInput,
    		$android,
    		$menuVisible,
    		$autoExport,
    		$exportPathIsAvailable,
    		$autoUpdate,
    		importData,
    		importJSONFile,
    		exportData,
    		updateList,
    		handleUpdateEveryHour,
    		handleExportEveryHour,
    		handleMenuVisibility,
    		showAllHiddenEntries,
    		anilistSignup,
    		showRecentReleases,
    		switchAppMode,
    		checkForUpdates,
    		reload,
    		refresh,
    		clearCache,
    		input_binding,
    		keydown_handler,
    		keydown_handler_1,
    		keydown_handler_2,
    		keydown_handler_3,
    		keydown_handler_4,
    		keydown_handler_5,
    		keydown_handler_6,
    		keydown_handler_7,
    		keydown_handler_8,
    		keydown_handler_9,
    		keydown_handler_10,
    		keydown_handler_11,
    		keydown_handler_12,
    		keydown_handler_13,
    		keydown_handler_14
    	];
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\Others\Search.svelte generated by Svelte v3.59.1 */

    const file$2 = "src\\components\\Others\\Search.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[98] = list[i].sortName;
    	child_ctx[100] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[101] = list[i].optionName;
    	child_ctx[102] = list[i].optionIdx;
    	child_ctx[103] = list[i].selected;
    	child_ctx[104] = list[i].changeType;
    	child_ctx[105] = list[i].filterType;
    	child_ctx[106] = list[i].categIdx;
    	child_ctx[107] = list[i].optionValue;
    	child_ctx[108] = list[i].optionType;
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[125] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[111] = list[i];
    	child_ctx[112] = list;
    	child_ctx[113] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[114] = list[i];
    	child_ctx[116] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[117] = list[i];
    	child_ctx[118] = list;
    	child_ctx[119] = i;
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[120] = list[i];
    	child_ctx[121] = list;
    	child_ctx[122] = i;
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[123] = list[i];
    	child_ctx[102] = i;
    	return child_ctx;
    }

    function get_each_context_8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[128] = list[i].filterSelectionName;
    	child_ctx[129] = list[i].isSelected;
    	return child_ctx;
    }

    // (1303:8) {:else}
    function create_else_block_8(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "skeleton shimmer svelte-1ss454j");
    			add_location(div, file$2, 1303, 12, 53007);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_8.name,
    		type: "else",
    		source: "(1303:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1295:8) {#if $filterOptions}
    function create_if_block_19(ctx) {
    	let span;
    	let h2;
    	let t_value = (/*$filterOptions*/ ctx[8]?.filterSelection?.filter?.(func_2)?.[0]?.filterSelectionName || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			h2 = element("h2");
    			t = text(t_value);
    			attr_dev(h2, "class", "svelte-1ss454j");
    			add_location(h2, file$2, 1296, 16, 52751);
    			attr_dev(span, "class", "svelte-1ss454j");
    			add_location(span, file$2, 1295, 12, 52727);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, h2);
    			append_dev(h2, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$filterOptions*/ 256 && t_value !== (t_value = (/*$filterOptions*/ ctx[8]?.filterSelection?.filter?.(func_2)?.[0]?.filterSelectionName || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_19.name,
    		type: "if",
    		source: "(1295:8) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (1306:8) {#if $dataStatus || !$username}
    function create_if_block_16(ctx) {
    	let span;
    	let h2;
    	let span_outro;
    	let current;

    	function select_block_type_1(ctx, dirty) {
    		if (/*$dataStatus*/ ctx[12]) return create_if_block_17;
    		if (!/*$username*/ ctx[14] && !/*$initData*/ ctx[10]) return create_if_block_18;
    		return create_else_block_7;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			h2 = element("h2");
    			if_block.c();
    			attr_dev(h2, "class", "svelte-1ss454j");
    			add_location(h2, file$2, 1307, 16, 53182);
    			attr_dev(span, "class", "data-status svelte-1ss454j");
    			add_location(span, file$2, 1306, 12, 53109);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, h2);
    			if_block.m(h2, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(h2, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (span_outro) span_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			span_outro = create_out_transition(span, fade, { duration: 300 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if_block.d();
    			if (detaching && span_outro) span_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(1306:8) {#if $dataStatus || !$username}",
    		ctx
    	});

    	return block;
    }

    // (1313:20) {:else}
    function create_else_block_7(ctx) {
    	let t_value = "" + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_7.name,
    		type: "else",
    		source: "(1313:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1311:55) 
    function create_if_block_18(ctx) {
    	let t_value = "No Anilist Username Found" + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_18.name,
    		type: "if",
    		source: "(1311:55) ",
    		ctx
    	});

    	return block;
    }

    // (1309:20) {#if $dataStatus}
    function create_if_block_17(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*$dataStatus*/ ctx[12]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$dataStatus*/ 4096) set_data_dev(t, /*$dataStatus*/ ctx[12]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_17.name,
    		type: "if",
    		source: "(1309:20) {#if $dataStatus}",
    		ctx
    	});

    	return block;
    }

    // (1346:16) {#if $filterOptions}
    function create_if_block_15(ctx) {
    	let div3;
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let t2;
    	let div0_tabindex_value;
    	let t3;
    	let div2;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let div3_class_value;
    	let mounted;
    	let dispose;
    	let each_value_8 = /*$filterOptions*/ ctx[8]?.filterSelection || [];
    	validate_each_argument(each_value_8);
    	const get_key = ctx => /*filterSelectionName*/ ctx[128];
    	validate_each_keys(ctx, each_value_8, get_each_context_8, get_key);

    	for (let i = 0; i < each_value_8.length; i += 1) {
    		let child_ctx = get_each_context_8(ctx, each_value_8, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_8(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Filters";
    			t1 = space();
    			div0 = element("div");
    			t2 = text("×");
    			t3 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h2, "class", "svelte-1ss454j");
    			add_location(h2, file$2, 1351, 28, 54847);
    			attr_dev(div0, "class", "closing-x svelte-1ss454j");

    			attr_dev(div0, "tabindex", div0_tabindex_value = /*selectedFilterTypeElement*/ ctx[3] && /*windowWidth*/ ctx[1] <= 425
    			? "0"
    			: "");

    			add_location(div0, file$2, 1353, 28, 54977);
    			attr_dev(div1, "class", "header svelte-1ss454j");
    			add_location(div1, file$2, 1350, 24, 54797);
    			attr_dev(div2, "class", "options svelte-1ss454j");
    			add_location(div2, file$2, 1367, 24, 55641);
    			attr_dev(div3, "class", div3_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedFilterTypeElement*/ ctx[3] ? "" : "hide")) + " svelte-1ss454j"));
    			add_location(div3, file$2, 1346, 20, 54610);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div2, null);
    				}
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "keydown", /*keydown_handler_1*/ ctx[40], false, false, false, false),
    					listen_dev(div0, "click", /*handleShowFilterTypes*/ ctx[19], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedFilterTypeElement, windowWidth*/ 10 && div0_tabindex_value !== (div0_tabindex_value = /*selectedFilterTypeElement*/ ctx[3] && /*windowWidth*/ ctx[1] <= 425
    			? "0"
    			: "")) {
    				attr_dev(div0, "tabindex", div0_tabindex_value);
    			}

    			if (dirty[0] & /*handleFilterTypes, $filterOptions*/ 262400) {
    				each_value_8 = /*$filterOptions*/ ctx[8]?.filterSelection || [];
    				validate_each_argument(each_value_8);
    				validate_each_keys(ctx, each_value_8, get_each_context_8, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_8, each_1_lookup, div2, destroy_block, create_each_block_8, null, get_each_context_8);
    			}

    			if (dirty[0] & /*selectedFilterTypeElement*/ 8 && div3_class_value !== (div3_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedFilterTypeElement*/ ctx[3] ? "" : "hide")) + " svelte-1ss454j"))) {
    				attr_dev(div3, "class", div3_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(1346:16) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (1369:28) {#each $filterOptions?.filterSelection || [] as { filterSelectionName, isSelected }
    function create_each_block_8(key_1, ctx) {
    	let div;
    	let h3;
    	let t0_value = (/*filterSelectionName*/ ctx[128] || "") + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function keydown_handler_2(...args) {
    		return /*keydown_handler_2*/ ctx[41](/*filterSelectionName*/ ctx[128], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(h3, "class", "svelte-1ss454j");
    			set_style(h3, "color", /*isSelected*/ ctx[129] ? "#3db4f2" : "inherit");
    			add_location(h3, file$2, 1378, 36, 56327);
    			attr_dev(div, "class", "option svelte-1ss454j");
    			add_location(div, file$2, 1369, 32, 55832);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t0);
    			append_dev(div, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						div,
    						"click",
    						function () {
    							if (is_function(/*handleFilterTypes*/ ctx[18](/*filterSelectionName*/ ctx[128]))) /*handleFilterTypes*/ ctx[18](/*filterSelectionName*/ ctx[128]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(div, "keydown", keydown_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$filterOptions*/ 256 && t0_value !== (t0_value = (/*filterSelectionName*/ ctx[128] || "") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$filterOptions*/ 256) {
    				set_style(h3, "color", /*isSelected*/ ctx[129] ? "#3db4f2" : "inherit");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_8.name,
    		type: "each",
    		source: "(1369:28) {#each $filterOptions?.filterSelection || [] as { filterSelectionName, isSelected }",
    		ctx
    	});

    	return block;
    }

    // (1689:8) {:else}
    function create_else_block_6(ctx) {
    	let each_1_anchor;
    	let each_value_7 = Array(10);
    	validate_each_argument(each_value_7);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_6.name,
    		type: "else",
    		source: "(1689:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1422:8) {#if $filterOptions}
    function create_if_block_6(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let each_value_2 = /*$filterOptions*/ ctx[8]?.filterSelection || [];
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*filterSelection*/ ctx[111].filterSelectionName;
    	validate_each_keys(ctx, each_value_2, get_each_context_2, get_key);

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_2(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$filterOptions, conditionalInputNumberList, showFilterOptions, handleInputNumber, handleCheckboxChange, $initData, Init, maxFilterSelectionHeight, handleFilterSelectOptionChange, closeFilterSelect, windowWidth, filterSelect*/ 32638279 | dirty[1] & /*pleaseWaitAlert*/ 8) {
    				each_value_2 = /*$filterOptions*/ ctx[8]?.filterSelection || [];
    				validate_each_argument(each_value_2);
    				validate_each_keys(ctx, each_value_2, get_each_context_2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_2, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block_2, each_1_anchor, get_each_context_2);
    			}
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(1422:8) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (1690:12) {#each Array(10) as _}
    function create_each_block_7(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			attr_dev(div0, "class", "filter-name skeleton shimmer svelte-1ss454j");
    			add_location(div0, file$2, 1691, 20, 73998);
    			attr_dev(div1, "class", "select skeleton shimmer svelte-1ss454j");
    			add_location(div1, file$2, 1692, 20, 74064);
    			attr_dev(div2, "class", "filter-select svelte-1ss454j");
    			add_location(div2, file$2, 1690, 16, 73949);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div2, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_7.name,
    		type: "each",
    		source: "(1690:12) {#each Array(10) as _}",
    		ctx
    	});

    	return block;
    }

    // (1472:28) {:else}
    function create_else_block_5(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "icon fa-solid fa-angle-down svelte-1ss454j");
    			add_location(i, file$2, 1472, 32, 60942);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_5.name,
    		type: "else",
    		source: "(1472:28) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1464:28) {#if Dropdown.selected && Dropdown.options.length && !Init}
    function create_if_block_14(ctx) {
    	let i;
    	let mounted;
    	let dispose;

    	function keydown_handler_4(...args) {
    		return /*keydown_handler_4*/ ctx[44](/*dropdownIdx*/ ctx[122], ...args);
    	}

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "icon fa-solid fa-angle-up svelte-1ss454j");
    			add_location(i, file$2, 1464, 32, 60492);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(i, "keydown", keydown_handler_4, false, false, false, false),
    					listen_dev(
    						i,
    						"click",
    						function () {
    							if (is_function(/*closeFilterSelect*/ ctx[21](/*dropdownIdx*/ ctx[122]))) /*closeFilterSelect*/ ctx[21](/*dropdownIdx*/ ctx[122]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(1464:28) {#if Dropdown.selected && Dropdown.options.length && !Init}",
    		ctx
    	});

    	return block;
    }

    // (1581:36) {:else}
    function create_else_block_4(ctx) {
    	let div;
    	let h3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "No Results";
    			attr_dev(h3, "class", "svelte-1ss454j");
    			add_location(h3, file$2, 1582, 44, 68147);
    			attr_dev(div, "class", "option svelte-1ss454j");
    			add_location(div, file$2, 1581, 40, 68081);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_4.name,
    		type: "else",
    		source: "(1581:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1529:36) {#if Dropdown.options?.filter?.(({ optionName }) => hasPartialMatch(optionName, Dropdown.optKeyword) || Dropdown.optKeyword === "")?.length}
    function create_if_block_10(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let each_value_6 = /*Dropdown*/ ctx[120].options || [];
    	validate_each_argument(each_value_6);
    	const get_key = ctx => /*filterSelection*/ ctx[111].filterSelectionName + /*Dropdown*/ ctx[120].filName + /*option*/ ctx[123].optionName;
    	validate_each_keys(ctx, each_value_6, get_each_context_6, get_key);

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		let child_ctx = get_each_context_6(ctx, each_value_6, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_6(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$filterOptions, handleFilterSelectOptionChange*/ 4194560) {
    				each_value_6 = /*Dropdown*/ ctx[120].options || [];
    				validate_each_argument(each_value_6);
    				validate_each_keys(ctx, each_value_6, get_each_context_6, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_6, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block_6, each_1_anchor, get_each_context_6);
    			}
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(1529:36) {#if Dropdown.options?.filter?.(({ optionName }) => hasPartialMatch(optionName, Dropdown.optKeyword) || Dropdown.optKeyword === \\\"\\\")?.length}",
    		ctx
    	});

    	return block;
    }

    // (1573:123) 
    function create_if_block_13(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fa-regular fa-circle-xmark async-element svelte-1ss454j");
    			set_style(i, "--optionColor", `#e85d75`);
    			add_location(i, file$2, 1573, 52, 67587);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(1573:123) ",
    		ctx
    	});

    	return block;
    }

    // (1561:48) {#if option.selected === "included"}
    function create_if_block_11(ctx) {
    	let if_block_anchor;

    	function select_block_type_6(ctx, dirty) {
    		if (/*filterSelection*/ ctx[111].filterSelectionName === "Content Caution") return create_if_block_12;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type_6(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type_6(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(1561:48) {#if option.selected === \\\"included\\\"}",
    		ctx
    	});

    	return block;
    }

    // (1567:52) {:else}
    function create_else_block_3(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fa-regular fa-circle-check async-element svelte-1ss454j");
    			set_style(i, "--optionColor", `#5f9ea0`);
    			add_location(i, file$2, 1567, 56, 67086);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(1567:52) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1562:52) {#if filterSelection.filterSelectionName === "Content Caution"}
    function create_if_block_12(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fa-regular fa-circle-xmark async-element svelte-1ss454j");
    			set_style(i, "--optionColor", `#5f9ea0`);
    			add_location(i, file$2, 1562, 56, 66704);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(1562:52) {#if filterSelection.filterSelectionName === \\\"Content Caution\\\"}",
    		ctx
    	});

    	return block;
    }

    // (1530:40) {#each Dropdown.options || [] as option, optionIdx (filterSelection.filterSelectionName + Dropdown.filName + option.optionName)}
    function create_each_block_6(key_1, ctx) {
    	let div;
    	let h3;
    	let t0_value = (/*option*/ ctx[123].optionName || "") + "";
    	let t0;
    	let t1;
    	let div_class_value;
    	let mounted;
    	let dispose;

    	function select_block_type_5(ctx, dirty) {
    		if (/*option*/ ctx[123].selected === "included") return create_if_block_11;
    		if (/*option*/ ctx[123].selected === "excluded" && /*Dropdown*/ ctx[120].changeType !== "read") return create_if_block_13;
    	}

    	let current_block_type = select_block_type_5(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	function keydown_handler_7(...args) {
    		return /*keydown_handler_7*/ ctx[49](/*option*/ ctx[123], /*Dropdown*/ ctx[120], /*optionIdx*/ ctx[102], /*dropdownIdx*/ ctx[122], /*filterSelection*/ ctx[111], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(h3, "class", "svelte-1ss454j");
    			add_location(h3, file$2, 1557, 48, 66305);

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("option " + (hasPartialMatch(/*option*/ ctx[123].optionName, /*Dropdown*/ ctx[120].optKeyword)
    			? ""
    			: "disable-interaction")) + " svelte-1ss454j"));

    			add_location(div, file$2, 1530, 44, 64390);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t0);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						div,
    						"click",
    						function () {
    							if (is_function(/*handleFilterSelectOptionChange*/ ctx[22](/*option*/ ctx[123].optionName, /*Dropdown*/ ctx[120].filName, /*optionIdx*/ ctx[102], /*dropdownIdx*/ ctx[122], /*Dropdown*/ ctx[120].changeType, /*filterSelection*/ ctx[111].filterSelectionName))) /*handleFilterSelectOptionChange*/ ctx[22](/*option*/ ctx[123].optionName, /*Dropdown*/ ctx[120].filName, /*optionIdx*/ ctx[102], /*dropdownIdx*/ ctx[122], /*Dropdown*/ ctx[120].changeType, /*filterSelection*/ ctx[111].filterSelectionName).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(div, "keydown", keydown_handler_7, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$filterOptions*/ 256 && t0_value !== (t0_value = (/*option*/ ctx[123].optionName || "") + "")) set_data_dev(t0, t0_value);

    			if (current_block_type === (current_block_type = select_block_type_5(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}

    			if (dirty[0] & /*$filterOptions*/ 256 && div_class_value !== (div_class_value = "" + (null_to_empty("option " + (hasPartialMatch(/*option*/ ctx[123].optionName, /*Dropdown*/ ctx[120].optKeyword)
    			? ""
    			: "disable-interaction")) + " svelte-1ss454j"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			if (if_block) {
    				if_block.d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(1530:40) {#each Dropdown.options || [] as option, optionIdx (filterSelection.filterSelectionName + Dropdown.filName + option.optionName)}",
    		ctx
    	});

    	return block;
    }

    // (1424:16) {#each filterSelection.filters.Dropdown || [] as Dropdown, dropdownIdx (filterSelection.filterSelectionName + Dropdown.filName)}
    function create_each_block_5(key_1, ctx) {
    	let div8;
    	let div0;
    	let h20;
    	let t0_value = (/*Dropdown*/ ctx[120].filName || "") + "";
    	let t0;
    	let t1;
    	let div2;
    	let div1;
    	let input0;
    	let input0_disabled_value;
    	let t2;
    	let div2_tabindex_value;
    	let t3;
    	let div7;
    	let div6;
    	let div4;
    	let h21;
    	let t4_value = /*Dropdown*/ ctx[120].filName + "";
    	let t4;
    	let t5;
    	let div3;
    	let t6;
    	let div3_tabindex_value;
    	let t7;
    	let input1;
    	let input1_disabled_value;
    	let t8;
    	let div5;
    	let show_if;
    	let div6_class_value;
    	let div7_class_value;
    	let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[2]}px`;
    	let div8_class_value;
    	let mounted;
    	let dispose;

    	function func_1(...args) {
    		return /*func_1*/ ctx[37](/*Dropdown*/ ctx[120], ...args);
    	}

    	function input0_input_handler() {
    		/*input0_input_handler*/ ctx[43].call(input0, /*filSelIdx*/ ctx[113], /*dropdownIdx*/ ctx[122]);
    	}

    	function select_block_type_3(ctx, dirty) {
    		if (/*Dropdown*/ ctx[120].selected && /*Dropdown*/ ctx[120].options.length && !/*Init*/ ctx[0]) return create_if_block_14;
    		return create_else_block_5;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block0 = current_block_type(ctx);

    	function keydown_handler_5(...args) {
    		return /*keydown_handler_5*/ ctx[45](/*dropdownIdx*/ ctx[122], ...args);
    	}

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[46](/*dropdownIdx*/ ctx[122], ...args);
    	}

    	function keydown_handler_6(...args) {
    		return /*keydown_handler_6*/ ctx[47](/*dropdownIdx*/ ctx[122], ...args);
    	}

    	function input1_input_handler() {
    		/*input1_input_handler*/ ctx[48].call(input1, /*filSelIdx*/ ctx[113], /*dropdownIdx*/ ctx[122]);
    	}

    	function select_block_type_4(ctx, dirty) {
    		if (dirty[0] & /*$filterOptions*/ 256) show_if = null;
    		if (show_if == null) show_if = !!/*Dropdown*/ ctx[120].options?.filter?.(func_1)?.length;
    		if (show_if) return create_if_block_10;
    		return create_else_block_4;
    	}

    	let current_block_type_1 = select_block_type_4(ctx, [-1, -1, -1, -1, -1]);
    	let if_block1 = current_block_type_1(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div8 = element("div");
    			div0 = element("div");
    			h20 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			input0 = element("input");
    			t2 = space();
    			if_block0.c();
    			t3 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div4 = element("div");
    			h21 = element("h2");
    			t4 = text(t4_value);
    			t5 = space();
    			div3 = element("div");
    			t6 = text("×");
    			t7 = space();
    			input1 = element("input");
    			t8 = space();
    			div5 = element("div");
    			if_block1.c();
    			attr_dev(h20, "class", "svelte-1ss454j");
    			add_location(h20, file$2, 1431, 28, 58654);
    			attr_dev(div0, "class", "filter-name svelte-1ss454j");
    			add_location(div0, file$2, 1430, 24, 58599);
    			attr_dev(input0, "placeholder", "Any");
    			attr_dev(input0, "type", "search");
    			attr_dev(input0, "enterkeyhint", "search");
    			attr_dev(input0, "autocomplete", "off");
    			attr_dev(input0, "class", "value-input svelte-1ss454j");
    			input0.disabled = input0_disabled_value = !/*showFilterOptions*/ ctx[6] || /*windowWidth*/ ctx[1] <= 425 || !/*filterSelection*/ ctx[111].isSelected;
    			add_location(input0, file$2, 1449, 32, 59598);
    			attr_dev(div1, "class", "value-wrap svelte-1ss454j");
    			add_location(div1, file$2, 1448, 28, 59540);
    			attr_dev(div2, "class", "select svelte-1ss454j");

    			attr_dev(div2, "tabindex", div2_tabindex_value = /*showFilterOptions*/ ctx[6] && /*windowWidth*/ ctx[1] <= 425 && /*filterSelection*/ ctx[111].isSelected
    			? "0"
    			: "");

    			add_location(div2, file$2, 1434, 24, 58825);
    			attr_dev(h21, "class", "svelte-1ss454j");
    			add_location(h21, file$2, 1494, 36, 62092);
    			attr_dev(div3, "class", "closing-x svelte-1ss454j");

    			attr_dev(div3, "tabindex", div3_tabindex_value = /*showFilterOptions*/ ctx[6] && /*Dropdown*/ ctx[120].selected
    			? "0"
    			: "");

    			add_location(div3, file$2, 1496, 36, 62249);
    			attr_dev(div4, "class", "header svelte-1ss454j");
    			add_location(div4, file$2, 1493, 32, 62034);
    			attr_dev(input1, "placeholder", "Any");
    			attr_dev(input1, "type", "search");
    			attr_dev(input1, "enterkeyhint", "search");
    			attr_dev(input1, "autocomplete", "off");
    			input1.disabled = input1_disabled_value = !/*showFilterOptions*/ ctx[6] || !/*filterSelection*/ ctx[111].isSelected || !/*Dropdown*/ ctx[120].selected;
    			attr_dev(input1, "class", "svelte-1ss454j");
    			add_location(input1, file$2, 1512, 32, 63119);
    			attr_dev(div5, "class", "options svelte-1ss454j");
    			add_location(div5, file$2, 1524, 32, 63831);

    			attr_dev(div6, "class", div6_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*Dropdown*/ ctx[120].options.length && /*Dropdown*/ ctx[120].selected === true && !/*Init*/ ctx[0]
    			? ""
    			: "hide")) + " svelte-1ss454j"));

    			add_location(div6, file$2, 1485, 28, 61622);

    			attr_dev(div7, "class", div7_class_value = "" + (null_to_empty("options-wrap " + (/*Dropdown*/ ctx[120].options.length && /*Dropdown*/ ctx[120].selected === true && !/*Init*/ ctx[0]
    			? ""
    			: "disable-interaction hide")) + " svelte-1ss454j"));

    			set_style(div7, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			add_location(div7, file$2, 1475, 24, 61076);

    			attr_dev(div8, "class", div8_class_value = "" + (null_to_empty("filter-select " + (/*filterSelection*/ ctx[111].isSelected
    			? ""
    			: "disable-interaction")) + " svelte-1ss454j"));

    			add_location(div8, file$2, 1424, 20, 58341);
    			this.first = div8;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div0);
    			append_dev(div0, h20);
    			append_dev(h20, t0);
    			append_dev(div8, t1);
    			append_dev(div8, div2);
    			append_dev(div2, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*$filterOptions*/ ctx[8].filterSelection[/*filSelIdx*/ ctx[113]].filters.Dropdown[/*dropdownIdx*/ ctx[122]].optKeyword);
    			append_dev(div2, t2);
    			if_block0.m(div2, null);
    			append_dev(div8, t3);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div4, h21);
    			append_dev(h21, t4);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, t6);
    			append_dev(div6, t7);
    			append_dev(div6, input1);
    			set_input_value(input1, /*$filterOptions*/ ctx[8].filterSelection[/*filSelIdx*/ ctx[113]].filters.Dropdown[/*dropdownIdx*/ ctx[122]].optKeyword);
    			append_dev(div6, t8);
    			append_dev(div6, div5);
    			if_block1.m(div5, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", input0_input_handler),
    					listen_dev(div2, "keydown", keydown_handler_5, false, false, false, false),
    					listen_dev(div2, "click", click_handler, false, false, false, false),
    					listen_dev(div3, "keydown", keydown_handler_6, false, false, false, false),
    					listen_dev(
    						div3,
    						"click",
    						function () {
    							if (is_function(/*closeFilterSelect*/ ctx[21](/*dropdownIdx*/ ctx[122]))) /*closeFilterSelect*/ ctx[21](/*dropdownIdx*/ ctx[122]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(input1, "input", input1_input_handler),
    					listen_dev(div5, "wheel", stop_propagation(wheel_handler), { passive: true }, false, true, false),
    					listen_dev(div7, "wheel", stop_propagation(wheel_handler_1), { passive: true }, false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$filterOptions*/ 256 && t0_value !== (t0_value = (/*Dropdown*/ ctx[120].filName || "") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*showFilterOptions, windowWidth, $filterOptions*/ 322 && input0_disabled_value !== (input0_disabled_value = !/*showFilterOptions*/ ctx[6] || /*windowWidth*/ ctx[1] <= 425 || !/*filterSelection*/ ctx[111].isSelected)) {
    				prop_dev(input0, "disabled", input0_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 256 && input0.value !== /*$filterOptions*/ ctx[8].filterSelection[/*filSelIdx*/ ctx[113]].filters.Dropdown[/*dropdownIdx*/ ctx[122]].optKeyword) {
    				set_input_value(input0, /*$filterOptions*/ ctx[8].filterSelection[/*filSelIdx*/ ctx[113]].filters.Dropdown[/*dropdownIdx*/ ctx[122]].optKeyword);
    			}

    			if (current_block_type === (current_block_type = select_block_type_3(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div2, null);
    				}
    			}

    			if (dirty[0] & /*showFilterOptions, windowWidth, $filterOptions*/ 322 && div2_tabindex_value !== (div2_tabindex_value = /*showFilterOptions*/ ctx[6] && /*windowWidth*/ ctx[1] <= 425 && /*filterSelection*/ ctx[111].isSelected
    			? "0"
    			: "")) {
    				attr_dev(div2, "tabindex", div2_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 256 && t4_value !== (t4_value = /*Dropdown*/ ctx[120].filName + "")) set_data_dev(t4, t4_value);

    			if (dirty[0] & /*showFilterOptions, $filterOptions*/ 320 && div3_tabindex_value !== (div3_tabindex_value = /*showFilterOptions*/ ctx[6] && /*Dropdown*/ ctx[120].selected
    			? "0"
    			: "")) {
    				attr_dev(div3, "tabindex", div3_tabindex_value);
    			}

    			if (dirty[0] & /*showFilterOptions, $filterOptions*/ 320 && input1_disabled_value !== (input1_disabled_value = !/*showFilterOptions*/ ctx[6] || !/*filterSelection*/ ctx[111].isSelected || !/*Dropdown*/ ctx[120].selected)) {
    				prop_dev(input1, "disabled", input1_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 256 && input1.value !== /*$filterOptions*/ ctx[8].filterSelection[/*filSelIdx*/ ctx[113]].filters.Dropdown[/*dropdownIdx*/ ctx[122]].optKeyword) {
    				set_input_value(input1, /*$filterOptions*/ ctx[8].filterSelection[/*filSelIdx*/ ctx[113]].filters.Dropdown[/*dropdownIdx*/ ctx[122]].optKeyword);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_4(ctx, dirty)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div5, null);
    				}
    			}

    			if (dirty[0] & /*$filterOptions, Init*/ 257 && div6_class_value !== (div6_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*Dropdown*/ ctx[120].options.length && /*Dropdown*/ ctx[120].selected === true && !/*Init*/ ctx[0]
    			? ""
    			: "hide")) + " svelte-1ss454j"))) {
    				attr_dev(div6, "class", div6_class_value);
    			}

    			if (dirty[0] & /*$filterOptions, Init*/ 257 && div7_class_value !== (div7_class_value = "" + (null_to_empty("options-wrap " + (/*Dropdown*/ ctx[120].options.length && /*Dropdown*/ ctx[120].selected === true && !/*Init*/ ctx[0]
    			? ""
    			: "disable-interaction hide")) + " svelte-1ss454j"))) {
    				attr_dev(div7, "class", div7_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 4 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[2]}px`)) {
    				set_style(div7, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			}

    			if (dirty[0] & /*$filterOptions*/ 256 && div8_class_value !== (div8_class_value = "" + (null_to_empty("filter-select " + (/*filterSelection*/ ctx[111].isSelected
    			? ""
    			: "disable-interaction")) + " svelte-1ss454j"))) {
    				attr_dev(div8, "class", div8_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    			if_block0.d();
    			if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(1424:16) {#each filterSelection.filters.Dropdown || [] as Dropdown, dropdownIdx (filterSelection.filterSelectionName + Dropdown.filName)}",
    		ctx
    	});

    	return block;
    }

    // (1592:20) {#if filterSelection.isSelected}
    function create_if_block_8(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div2;
    	let t1;
    	let div1;
    	let t2_value = (/*Checkbox*/ ctx[117].filName || "") + "";
    	let t2;
    	let mounted;
    	let dispose;

    	function select_block_type_7(ctx, dirty) {
    		if (/*$initData*/ ctx[10]) return create_if_block_9;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_7(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[53](/*Checkbox*/ ctx[117], /*checkboxIdx*/ ctx[119], /*filterSelection*/ ctx[111], ...args);
    	}

    	function keydown_handler_8(...args) {
    		return /*keydown_handler_8*/ ctx[54](/*Checkbox*/ ctx[117], /*checkboxIdx*/ ctx[119], /*filterSelection*/ ctx[111], ...args);
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			if_block.c();
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			attr_dev(div0, "class", "svelte-1ss454j");
    			set_style(div0, "visibility", `none`);
    			add_location(div0, file$2, 1593, 28, 68703);
    			attr_dev(div1, "class", "checkbox-label svelte-1ss454j");
    			add_location(div1, file$2, 1638, 32, 71210);
    			attr_dev(div2, "class", "checkbox-wrap svelte-1ss454j");
    			add_location(div2, file$2, 1594, 28, 68764);
    			attr_dev(div3, "class", "filter-checkbox svelte-1ss454j");
    			add_location(div3, file$2, 1592, 24, 68644);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			if_block.m(div2, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div2, "click", click_handler_1, false, false, false, false),
    					listen_dev(div2, "keydown", keydown_handler_8, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type_7(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div2, t1);
    				}
    			}

    			if (dirty[0] & /*$filterOptions*/ 256 && t2_value !== (t2_value = (/*Checkbox*/ ctx[117].filName || "") + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(1592:20) {#if filterSelection.isSelected}",
    		ctx
    	});

    	return block;
    }

    // (1624:32) {:else}
    function create_else_block_2(ctx) {
    	let input;
    	let input_disabled_value;
    	let mounted;
    	let dispose;

    	function change_handler_1(...args) {
    		return /*change_handler_1*/ ctx[51](/*Checkbox*/ ctx[117], /*checkboxIdx*/ ctx[119], /*filterSelection*/ ctx[111], ...args);
    	}

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[52].call(input, /*each_value_4*/ ctx[118], /*checkboxIdx*/ ctx[119]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "checkbox svelte-1ss454j");
    			input.disabled = input_disabled_value = !/*showFilterOptions*/ ctx[6];
    			add_location(input, file$2, 1624, 36, 70389);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			input.checked = /*Checkbox*/ ctx[117].isSelected;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", change_handler_1, false, false, false, false),
    					listen_dev(input, "change", input_change_handler)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*showFilterOptions*/ 64 && input_disabled_value !== (input_disabled_value = !/*showFilterOptions*/ ctx[6])) {
    				prop_dev(input, "disabled", input_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 256) {
    				input.checked = /*Checkbox*/ ctx[117].isSelected;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(1624:32) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1613:32) {#if $initData}
    function create_if_block_9(ctx) {
    	let input;
    	let input_checked_value;
    	let input_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "checkbox svelte-1ss454j");
    			input.checked = input_checked_value = /*Checkbox*/ ctx[117].isSelected;
    			input.disabled = input_disabled_value = !/*showFilterOptions*/ ctx[6];
    			add_location(input, file$2, 1613, 36, 69767);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*change_handler*/ ctx[50], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$filterOptions*/ 256 && input_checked_value !== (input_checked_value = /*Checkbox*/ ctx[117].isSelected)) {
    				prop_dev(input, "checked", input_checked_value);
    			}

    			if (dirty[0] & /*showFilterOptions*/ 64 && input_disabled_value !== (input_disabled_value = !/*showFilterOptions*/ ctx[6])) {
    				prop_dev(input, "disabled", input_disabled_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(1613:32) {#if $initData}",
    		ctx
    	});

    	return block;
    }

    // (1591:16) {#each filterSelection.filters.Checkbox || [] as Checkbox, checkboxIdx (filterSelection.filterSelectionName + Checkbox.filName)}
    function create_each_block_4(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = /*filterSelection*/ ctx[111].isSelected && create_if_block_8(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*filterSelection*/ ctx[111].isSelected) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_8(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(1591:16) {#each filterSelection.filters.Checkbox || [] as Checkbox, checkboxIdx (filterSelection.filterSelectionName + Checkbox.filName)}",
    		ctx
    	});

    	return block;
    }

    // (1647:20) {#if filterSelection.isSelected}
    function create_if_block_7(ctx) {
    	let div2;
    	let div0;
    	let h2;
    	let t0_value = (/*inputNum*/ ctx[114].filName || "") + "";
    	let t0;
    	let t1;
    	let div1;
    	let input;
    	let input_placeholder_value;
    	let input_value_value;
    	let input_disabled_value;
    	let t2;
    	let mounted;
    	let dispose;

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[55](/*inputNumIdx*/ ctx[116], /*inputNum*/ ctx[114], /*filterSelection*/ ctx[111], ...args);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			input = element("input");
    			t2 = space();
    			attr_dev(h2, "class", "svelte-1ss454j");
    			add_location(h2, file$2, 1654, 32, 72035);
    			attr_dev(div0, "class", "filter-input-number-name svelte-1ss454j");
    			add_location(div0, file$2, 1653, 28, 71963);
    			attr_dev(input, "class", "value-input-number svelte-1ss454j");
    			attr_dev(input, "type", "text");

    			attr_dev(input, "placeholder", input_placeholder_value = /*inputNum*/ ctx[114].filName === "scoring system"
    			? "Default: User Scoring"
    			: /*conditionalInputNumberList*/ ctx[17].includes(/*inputNum*/ ctx[114].filName)
    				? ">123 or 123"
    				: /*inputNum*/ ctx[114].defaultValue !== null
    					? "Default: " + /*inputNum*/ ctx[114].defaultValue
    					: "123");

    			input.value = input_value_value = /*inputNum*/ ctx[114].numberValue || "";
    			input.disabled = input_disabled_value = !/*showFilterOptions*/ ctx[6];
    			add_location(input, file$2, 1657, 32, 72205);
    			attr_dev(div1, "class", "value-input-number-wrap svelte-1ss454j");
    			add_location(div1, file$2, 1656, 28, 72134);
    			attr_dev(div2, "class", "filter-input-number svelte-1ss454j");
    			set_style(div2, "display", /*filterSelection*/ ctx[111].isSelected ? "" : "none");
    			add_location(div2, file$2, 1647, 24, 71693);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, input);
    			append_dev(div2, t2);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", input_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$filterOptions*/ 256 && t0_value !== (t0_value = (/*inputNum*/ ctx[114].filName || "") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$filterOptions*/ 256 && input_placeholder_value !== (input_placeholder_value = /*inputNum*/ ctx[114].filName === "scoring system"
    			? "Default: User Scoring"
    			: /*conditionalInputNumberList*/ ctx[17].includes(/*inputNum*/ ctx[114].filName)
    				? ">123 or 123"
    				: /*inputNum*/ ctx[114].defaultValue !== null
    					? "Default: " + /*inputNum*/ ctx[114].defaultValue
    					: "123")) {
    				attr_dev(input, "placeholder", input_placeholder_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 256 && input_value_value !== (input_value_value = /*inputNum*/ ctx[114].numberValue || "") && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty[0] & /*showFilterOptions*/ 64 && input_disabled_value !== (input_disabled_value = !/*showFilterOptions*/ ctx[6])) {
    				prop_dev(input, "disabled", input_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 256) {
    				set_style(div2, "display", /*filterSelection*/ ctx[111].isSelected ? "" : "none");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(1647:20) {#if filterSelection.isSelected}",
    		ctx
    	});

    	return block;
    }

    // (1646:16) {#each filterSelection.filters["Input Number"] || [] as inputNum, inputNumIdx (filterSelection.filterSelectionName + inputNum.filName)}
    function create_each_block_3(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = /*filterSelection*/ ctx[111].isSelected && create_if_block_7(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*filterSelection*/ ctx[111].isSelected) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_7(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(1646:16) {#each filterSelection.filters[\\\"Input Number\\\"] || [] as inputNum, inputNumIdx (filterSelection.filterSelectionName + inputNum.filName)}",
    		ctx
    	});

    	return block;
    }

    // (1423:12) {#each $filterOptions?.filterSelection || [] as filterSelection, filSelIdx (filterSelection.filterSelectionName)}
    function create_each_block_2(key_1, ctx) {
    	let first;
    	let each_blocks_2 = [];
    	let each0_lookup = new Map();
    	let t0;
    	let each_blocks_1 = [];
    	let each1_lookup = new Map();
    	let t1;
    	let each_blocks = [];
    	let each2_lookup = new Map();
    	let each2_anchor;
    	let each_value_5 = /*filterSelection*/ ctx[111].filters.Dropdown || [];
    	validate_each_argument(each_value_5);
    	const get_key = ctx => /*filterSelection*/ ctx[111].filterSelectionName + /*Dropdown*/ ctx[120].filName;
    	validate_each_keys(ctx, each_value_5, get_each_context_5, get_key);

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		let child_ctx = get_each_context_5(ctx, each_value_5, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_2[i] = create_each_block_5(key, child_ctx));
    	}

    	let each_value_4 = /*filterSelection*/ ctx[111].filters.Checkbox || [];
    	validate_each_argument(each_value_4);
    	const get_key_1 = ctx => /*filterSelection*/ ctx[111].filterSelectionName + /*Checkbox*/ ctx[117].filName;
    	validate_each_keys(ctx, each_value_4, get_each_context_4, get_key_1);

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		let child_ctx = get_each_context_4(ctx, each_value_4, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks_1[i] = create_each_block_4(key, child_ctx));
    	}

    	let each_value_3 = /*filterSelection*/ ctx[111].filters["Input Number"] || [];
    	validate_each_argument(each_value_3);
    	const get_key_2 = ctx => /*filterSelection*/ ctx[111].filterSelectionName + /*inputNum*/ ctx[114].filName;
    	validate_each_keys(ctx, each_value_3, get_each_context_3, get_key_2);

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		let child_ctx = get_each_context_3(ctx, each_value_3, i);
    		let key = get_key_2(child_ctx);
    		each2_lookup.set(key, each_blocks[i] = create_each_block_3(key, child_ctx));
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t0 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each2_anchor = empty();
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t0, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each2_anchor, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$filterOptions, Init, maxFilterSelectionHeight, handleFilterSelectOptionChange, showFilterOptions, closeFilterSelect, windowWidth, filterSelect*/ 7340359) {
    				each_value_5 = /*filterSelection*/ ctx[111].filters.Dropdown || [];
    				validate_each_argument(each_value_5);
    				validate_each_keys(ctx, each_value_5, get_each_context_5, get_key);
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key, 1, ctx, each_value_5, each0_lookup, t0.parentNode, destroy_block, create_each_block_5, t0, get_each_context_5);
    			}

    			if (dirty[0] & /*handleCheckboxChange, $filterOptions, showFilterOptions, $initData*/ 8389952 | dirty[1] & /*pleaseWaitAlert*/ 8) {
    				each_value_4 = /*filterSelection*/ ctx[111].filters.Checkbox || [];
    				validate_each_argument(each_value_4);
    				validate_each_keys(ctx, each_value_4, get_each_context_4, get_key_1);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_1, 1, ctx, each_value_4, each1_lookup, t1.parentNode, destroy_block, create_each_block_4, t1, get_each_context_4);
    			}

    			if (dirty[0] & /*$filterOptions, conditionalInputNumberList, showFilterOptions, handleInputNumber*/ 16908608) {
    				each_value_3 = /*filterSelection*/ ctx[111].filters["Input Number"] || [];
    				validate_each_argument(each_value_3);
    				validate_each_keys(ctx, each_value_3, get_each_context_3, get_key_2);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_2, 1, ctx, each_value_3, each2_lookup, each2_anchor.parentNode, destroy_block, create_each_block_3, each2_anchor, get_each_context_3);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].d(detaching);
    			}

    			if (detaching) detach_dev(t0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d(detaching);
    			}

    			if (detaching) detach_dev(t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(1423:12) {#each $filterOptions?.filterSelection || [] as filterSelection, filSelIdx (filterSelection.filterSelectionName)}",
    		ctx
    	});

    	return block;
    }

    // (1700:8) {#if !showAllActiveFilters}
    function create_if_block_5(ctx) {
    	let div;
    	let i;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "fa-solid fa-ban svelte-1ss454j");
    			add_location(i, file$2, 1707, 16, 74640);
    			attr_dev(div, "tabindex", "0");
    			attr_dev(div, "class", "empty-tagFilter svelte-1ss454j");
    			attr_dev(div, "title", "Remove Filters");
    			add_location(div, file$2, 1700, 12, 74365);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*removeAllActiveTag*/ ctx[27], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_9*/ ctx[57], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(1700:8) {#if !showAllActiveFilters}",
    		ctx
    	});

    	return block;
    }

    // (1716:12) {#if showAllActiveFilters}
    function create_if_block_4(ctx) {
    	let div;
    	let i;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "fa-solid fa-ban svelte-1ss454j");
    			add_location(i, file$2, 1724, 20, 75248);
    			attr_dev(div, "tabindex", "0");
    			attr_dev(div, "class", "empty-tagFilter svelte-1ss454j");
    			attr_dev(div, "title", "Remove Filters");
    			add_location(div, file$2, 1716, 16, 74920);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*removeAllActiveTag*/ ctx[27], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_10*/ ctx[58], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(1716:12) {#if showAllActiveFilters}",
    		ctx
    	});

    	return block;
    }

    // (1768:20) {:else}
    function create_else_block_1(ctx) {
    	let h3;
    	let t_value = (/*optionName*/ ctx[101] || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "svelte-1ss454j");
    			add_location(h3, file$2, 1768, 24, 77320);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$activeTagFilters, $filterOptions*/ 2304 && t_value !== (t_value = (/*optionName*/ ctx[101] || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(1768:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1766:41) 
    function create_if_block_3(ctx) {
    	let h3;
    	let t_value = (/*optionType*/ ctx[108] + ": " + /*optionName*/ ctx[101] || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "svelte-1ss454j");
    			add_location(h3, file$2, 1766, 24, 77218);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$activeTagFilters, $filterOptions*/ 2304 && t_value !== (t_value = (/*optionType*/ ctx[108] + ": " + /*optionName*/ ctx[101] || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(1766:41) ",
    		ctx
    	});

    	return block;
    }

    // (1762:20) {#if filterType === "input number"}
    function create_if_block_2(ctx) {
    	let h3;
    	let t_value = (/*optionName*/ ctx[101] + ": " + /*optionValue*/ ctx[107] || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "svelte-1ss454j");
    			add_location(h3, file$2, 1762, 24, 77045);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$activeTagFilters, $filterOptions*/ 2304 && t_value !== (t_value = (/*optionName*/ ctx[101] + ": " + /*optionValue*/ ctx[107] || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(1762:20) {#if filterType === \\\"input number\\\"}",
    		ctx
    	});

    	return block;
    }

    // (1728:12) {#each $activeTagFilters?.[$filterOptions?.filterSelection?.[$filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected)]?.filterSelectionName] || [] as { optionName, optionIdx, selected, changeType, filterType, categIdx, optionValue, optionType }
    function create_each_block_1(key_1, ctx) {
    	let div;
    	let t0;
    	let i;
    	let t1;
    	let div_transition;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type_8(ctx, dirty) {
    		if (/*filterType*/ ctx[105] === "input number") return create_if_block_2;
    		if (/*optionType*/ ctx[108]) return create_if_block_3;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_8(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[59](/*optionIdx*/ ctx[102], /*optionName*/ ctx[101], /*filterType*/ ctx[105], /*categIdx*/ ctx[106], /*optionType*/ ctx[108], ...args);
    	}

    	function keydown_handler_11(...args) {
    		return /*keydown_handler_11*/ ctx[60](/*optionIdx*/ ctx[102], /*optionName*/ ctx[101], /*filterType*/ ctx[105], /*categIdx*/ ctx[106], /*optionType*/ ctx[108], ...args);
    	}

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[61](/*optionIdx*/ ctx[102], /*optionName*/ ctx[101], /*filterType*/ ctx[105], /*categIdx*/ ctx[106], /*changeType*/ ctx[104], /*optionType*/ ctx[108], /*optionValue*/ ctx[107], ...args);
    	}

    	function keydown_handler_12(...args) {
    		return /*keydown_handler_12*/ ctx[62](/*optionIdx*/ ctx[102], /*optionName*/ ctx[101], /*filterType*/ ctx[105], /*categIdx*/ ctx[106], /*changeType*/ ctx[104], /*optionType*/ ctx[108], /*optionValue*/ ctx[107], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			t0 = space();
    			i = element("i");
    			t1 = space();
    			attr_dev(i, "class", "fa-solid fa-xmark svelte-1ss454j");
    			attr_dev(i, "tabindex", "0");
    			add_location(i, file$2, 1770, 20, 77396);
    			attr_dev(div, "class", "activeTagFilter svelte-1ss454j");
    			attr_dev(div, "tabindex", "0");

    			set_style(div, "--activeTagFilterColor", /*selected*/ ctx[103] === "included"
    			? "#5f9ea0"
    			: /*changeType*/ ctx[104] === "read" ? "#000" : "#e85d75");

    			add_location(div, file$2, 1728, 16, 75661);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, i);
    			append_dev(div, t1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(i, "click", prevent_default(click_handler_2), false, true, false, false),
    					listen_dev(i, "keydown", keydown_handler_11, false, false, false, false),
    					listen_dev(div, "click", click_handler_3, false, false, false, false),
    					listen_dev(div, "keydown", keydown_handler_12, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type_8(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			}

    			if (dirty[0] & /*$activeTagFilters, $filterOptions*/ 2304) {
    				set_style(div, "--activeTagFilterColor", /*selected*/ ctx[103] === "included"
    				? "#5f9ea0"
    				: /*changeType*/ ctx[104] === "read" ? "#000" : "#e85d75");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: -10, duration: 300 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: -10, duration: 300 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			if (detaching && div_transition) div_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(1728:12) {#each $activeTagFilters?.[$filterOptions?.filterSelection?.[$filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected)]?.filterSelectionName] || [] as { optionName, optionIdx, selected, changeType, filterType, categIdx, optionValue, optionType }",
    		ctx
    	});

    	return block;
    }

    // (1906:4) {:else}
    function create_else_block(ctx) {
    	let div2;
    	let div0;
    	let i;
    	let i_class_value;
    	let t;
    	let div1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			i = element("i");
    			t = space();
    			div1 = element("div");

    			attr_dev(i, "class", i_class_value = "" + (null_to_empty("icon fa-solid fa-arrows-" + (/*$gridFullView*/ ctx[9] ?? getLocalStorage('gridFullView') ?? !/*$android*/ ctx[16]
    			? "up-down"
    			: "left-right")) + " svelte-1ss454j"));

    			add_location(i, file$2, 1914, 16, 84041);
    			attr_dev(div0, "tabindex", "0");
    			attr_dev(div0, "class", "changeGridView svelte-1ss454j");
    			add_location(div0, file$2, 1908, 12, 83816);
    			attr_dev(div1, "class", "sortFilter skeleton shimmer svelte-1ss454j");
    			add_location(div1, file$2, 1919, 12, 84270);
    			attr_dev(div2, "class", "last-filter-option svelte-1ss454j");
    			add_location(div2, file$2, 1907, 8, 83770);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, i);
    			append_dev(div2, t);
    			append_dev(div2, div1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*handleGridView*/ ctx[31], false, false, false, false),
    					listen_dev(div0, "keydown", /*keydown_handler_19*/ ctx[69], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$gridFullView, $android*/ 66048 && i_class_value !== (i_class_value = "" + (null_to_empty("icon fa-solid fa-arrows-" + (/*$gridFullView*/ ctx[9] ?? getLocalStorage('gridFullView') ?? !/*$android*/ ctx[16]
    			? "up-down"
    			: "left-right")) + " svelte-1ss454j"))) {
    				attr_dev(i, "class", i_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(1906:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1810:4) {#if $filterOptions}
    function create_if_block$2(ctx) {
    	let div7;
    	let div0;
    	let i0;
    	let i0_class_value;
    	let t0;
    	let div6;
    	let i1;
    	let i1_tabindex_value;
    	let i1_class_value;
    	let t1;
    	let h20;
    	let t2_value = (/*$filterOptions*/ ctx[8]?.sortFilter?.[/*$filterOptions*/ ctx[8]?.sortFilter.findIndex(func_5)]?.sortName || "") + "";
    	let t2;
    	let h20_tabindex_value;
    	let t3;
    	let div5;
    	let div4;
    	let div2;
    	let h21;
    	let t5;
    	let div1;
    	let t6;
    	let div1_tabindex_value;
    	let t7;
    	let div3;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let div4_class_value;
    	let div5_class_value;
    	let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[2]}px`;
    	let mounted;
    	let dispose;
    	let each_value = /*$filterOptions*/ ctx[8]?.sortFilter || [];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*sortName*/ ctx[98] + /*sortIdx*/ ctx[100];
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div0 = element("div");
    			i0 = element("i");
    			t0 = space();
    			div6 = element("div");
    			i1 = element("i");
    			t1 = space();
    			h20 = element("h2");
    			t2 = text(t2_value);
    			t3 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Sort By";
    			t5 = space();
    			div1 = element("div");
    			t6 = text("×");
    			t7 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(i0, "class", i0_class_value = "" + (null_to_empty("icon fa-solid fa-arrows-" + (/*$gridFullView*/ ctx[9] ?? getLocalStorage('gridFullView') ?? !/*$android*/ ctx[16]
    			? "up-down"
    			: "left-right")) + " svelte-1ss454j"));

    			add_location(i0, file$2, 1818, 16, 79223);
    			attr_dev(div0, "tabindex", "0");
    			attr_dev(div0, "class", "changeGridView svelte-1ss454j");
    			add_location(div0, file$2, 1812, 12, 78998);
    			attr_dev(i1, "tabindex", i1_tabindex_value = /*selectedSortElement*/ ctx[4] ? "" : "0");

    			attr_dev(i1, "class", i1_class_value = "" + (null_to_empty("fa-duotone fa-sort-" + (/*$filterOptions*/ ctx[8]?.sortFilter?.[/*$filterOptions*/ ctx[8]?.sortFilter?.findIndex(func_4)]?.sortType === "asc"
    			? "up"
    			: "down")) + " svelte-1ss454j"));

    			add_location(i1, file$2, 1824, 16, 79494);
    			attr_dev(h20, "tabindex", h20_tabindex_value = /*selectedSortElement*/ ctx[4] ? "" : "0");
    			attr_dev(h20, "class", "svelte-1ss454j");
    			add_location(h20, file$2, 1837, 16, 80125);
    			attr_dev(h21, "class", "svelte-1ss454j");
    			add_location(h21, file$2, 1859, 28, 81155);
    			attr_dev(div1, "class", "closing-x svelte-1ss454j");

    			attr_dev(div1, "tabindex", div1_tabindex_value = /*selectedSortElement*/ ctx[4] && /*windowWidth*/ ctx[1] <= 425
    			? "0"
    			: "");

    			add_location(div1, file$2, 1861, 28, 81285);
    			attr_dev(div2, "class", "header svelte-1ss454j");
    			add_location(div2, file$2, 1858, 24, 81105);
    			attr_dev(div3, "class", "options svelte-1ss454j");
    			add_location(div3, file$2, 1875, 24, 81943);
    			attr_dev(div4, "class", div4_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedSortElement*/ ctx[4] ? "" : "hide")) + " svelte-1ss454j"));
    			add_location(div4, file$2, 1854, 20, 80924);

    			attr_dev(div5, "class", div5_class_value = "" + (null_to_empty("options-wrap " + (/*selectedSortElement*/ ctx[4]
    			? ""
    			: "disable-interaction hide")) + " svelte-1ss454j"));

    			set_style(div5, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			add_location(div5, file$2, 1849, 16, 80666);
    			attr_dev(div6, "class", "sortFilter svelte-1ss454j");
    			add_location(div6, file$2, 1823, 12, 79452);
    			attr_dev(div7, "class", "last-filter-option svelte-1ss454j");
    			add_location(div7, file$2, 1811, 8, 78952);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			append_dev(div0, i0);
    			append_dev(div7, t0);
    			append_dev(div7, div6);
    			append_dev(div6, i1);
    			append_dev(div6, t1);
    			append_dev(div6, h20);
    			append_dev(h20, t2);
    			append_dev(div6, t3);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, h21);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, t6);
    			append_dev(div4, t7);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div3, null);
    				}
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*handleGridView*/ ctx[31], false, false, false, false),
    					listen_dev(div0, "keydown", /*keydown_handler_14*/ ctx[64], false, false, false, false),
    					listen_dev(i1, "click", /*changeSortType*/ ctx[30], false, false, false, false),
    					listen_dev(i1, "keydown", /*keydown_handler_15*/ ctx[65], false, false, false, false),
    					listen_dev(h20, "click", /*handleSortFilterPopup*/ ctx[28], false, false, false, false),
    					listen_dev(h20, "keydown", /*keydown_handler_16*/ ctx[66], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_17*/ ctx[67], false, false, false, false),
    					listen_dev(div1, "click", /*handleSortFilterPopup*/ ctx[28], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$gridFullView, $android*/ 66048 && i0_class_value !== (i0_class_value = "" + (null_to_empty("icon fa-solid fa-arrows-" + (/*$gridFullView*/ ctx[9] ?? getLocalStorage('gridFullView') ?? !/*$android*/ ctx[16]
    			? "up-down"
    			: "left-right")) + " svelte-1ss454j"))) {
    				attr_dev(i0, "class", i0_class_value);
    			}

    			if (dirty[0] & /*selectedSortElement*/ 16 && i1_tabindex_value !== (i1_tabindex_value = /*selectedSortElement*/ ctx[4] ? "" : "0")) {
    				attr_dev(i1, "tabindex", i1_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 256 && i1_class_value !== (i1_class_value = "" + (null_to_empty("fa-duotone fa-sort-" + (/*$filterOptions*/ ctx[8]?.sortFilter?.[/*$filterOptions*/ ctx[8]?.sortFilter?.findIndex(func_4)]?.sortType === "asc"
    			? "up"
    			: "down")) + " svelte-1ss454j"))) {
    				attr_dev(i1, "class", i1_class_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 256 && t2_value !== (t2_value = (/*$filterOptions*/ ctx[8]?.sortFilter?.[/*$filterOptions*/ ctx[8]?.sortFilter.findIndex(func_5)]?.sortName || "") + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*selectedSortElement*/ 16 && h20_tabindex_value !== (h20_tabindex_value = /*selectedSortElement*/ ctx[4] ? "" : "0")) {
    				attr_dev(h20, "tabindex", h20_tabindex_value);
    			}

    			if (dirty[0] & /*selectedSortElement, windowWidth*/ 18 && div1_tabindex_value !== (div1_tabindex_value = /*selectedSortElement*/ ctx[4] && /*windowWidth*/ ctx[1] <= 425
    			? "0"
    			: "")) {
    				attr_dev(div1, "tabindex", div1_tabindex_value);
    			}

    			if (dirty[0] & /*changeSort, $filterOptions*/ 536871168) {
    				each_value = /*$filterOptions*/ ctx[8]?.sortFilter || [];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div3, destroy_block, create_each_block, null, get_each_context);
    			}

    			if (dirty[0] & /*selectedSortElement*/ 16 && div4_class_value !== (div4_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedSortElement*/ ctx[4] ? "" : "hide")) + " svelte-1ss454j"))) {
    				attr_dev(div4, "class", div4_class_value);
    			}

    			if (dirty[0] & /*selectedSortElement*/ 16 && div5_class_value !== (div5_class_value = "" + (null_to_empty("options-wrap " + (/*selectedSortElement*/ ctx[4]
    			? ""
    			: "disable-interaction hide")) + " svelte-1ss454j"))) {
    				attr_dev(div5, "class", div5_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 4 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[2]}px`)) {
    				set_style(div5, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(1810:4) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (1886:36) {#if $filterOptions?.sortFilter?.[$filterOptions?.sortFilter?.findIndex(({ sortType }) => sortType !== "none")].sortName === sortName && sortName}
    function create_if_block_1$2(ctx) {
    	let i;
    	let i_class_value;

    	const block = {
    		c: function create() {
    			i = element("i");

    			attr_dev(i, "class", i_class_value = "" + (null_to_empty("fa-duotone fa-sort-" + (/*$filterOptions*/ ctx[8]?.sortFilter?.[/*$filterOptions*/ ctx[8]?.sortFilter?.findIndex(func_6)].sortType === "asc"
    			? "up"
    			: "down")) + " svelte-1ss454j"));

    			add_location(i, file$2, 1886, 40, 82744);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$filterOptions*/ 256 && i_class_value !== (i_class_value = "" + (null_to_empty("fa-duotone fa-sort-" + (/*$filterOptions*/ ctx[8]?.sortFilter?.[/*$filterOptions*/ ctx[8]?.sortFilter?.findIndex(func_6)].sortType === "asc"
    			? "up"
    			: "down")) + " svelte-1ss454j"))) {
    				attr_dev(i, "class", i_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(1886:36) {#if $filterOptions?.sortFilter?.[$filterOptions?.sortFilter?.findIndex(({ sortType }) => sortType !== \\\"none\\\")].sortName === sortName && sortName}",
    		ctx
    	});

    	return block;
    }

    // (1877:28) {#each $filterOptions?.sortFilter || [] as { sortName }
    function create_each_block(key_1, ctx) {
    	let div;
    	let h3;
    	let t0_value = (/*sortName*/ ctx[98] || "") + "";
    	let t0;
    	let t1;
    	let show_if = /*$filterOptions*/ ctx[8]?.sortFilter?.[/*$filterOptions*/ ctx[8]?.sortFilter?.findIndex(func)].sortName === /*sortName*/ ctx[98] && /*sortName*/ ctx[98];
    	let t2;
    	let mounted;
    	let dispose;
    	let if_block = show_if && create_if_block_1$2(ctx);

    	function keydown_handler_18(...args) {
    		return /*keydown_handler_18*/ ctx[68](/*sortName*/ ctx[98], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			attr_dev(h3, "class", "svelte-1ss454j");
    			add_location(h3, file$2, 1884, 36, 82493);
    			attr_dev(div, "class", "option svelte-1ss454j");
    			add_location(div, file$2, 1877, 32, 82114);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t0);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						div,
    						"click",
    						function () {
    							if (is_function(/*changeSort*/ ctx[29](/*sortName*/ ctx[98]))) /*changeSort*/ ctx[29](/*sortName*/ ctx[98]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(div, "keydown", keydown_handler_18, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$filterOptions*/ 256 && t0_value !== (t0_value = (/*sortName*/ ctx[98] || "") + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*$filterOptions*/ 256) show_if = /*$filterOptions*/ ctx[8]?.sortFilter?.[/*$filterOptions*/ ctx[8]?.sortFilter?.findIndex(func)].sortName === /*sortName*/ ctx[98] && /*sortName*/ ctx[98];

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(div, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(1877:28) {#each $filterOptions?.sortFilter || [] as { sortName }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let main;
    	let div0;
    	let t0;
    	let t1;
    	let div4;
    	let input;
    	let t2;
    	let div2;
    	let i0;
    	let i0_tabindex_value;
    	let t3;
    	let div1;
    	let div1_class_value;
    	let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[2]}px`;
    	let t4;
    	let div3;
    	let i1;
    	let t5;
    	let div5;
    	let div5_class_value;
    	let t6;
    	let div8;
    	let t7;
    	let div6;
    	let t8;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t9;
    	let div7;
    	let i2;
    	let i2_class_value;
    	let div8_class_value;
    	let t10;
    	let t11;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[8]) return create_if_block_19;
    		return create_else_block_8;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = (/*$dataStatus*/ ctx[12] || !/*$username*/ ctx[14]) && create_if_block_16(ctx);
    	let if_block2 = /*$filterOptions*/ ctx[8] && create_if_block_15(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[8]) return create_if_block_6;
    		return create_else_block_6;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block3 = current_block_type_1(ctx);
    	let if_block4 = !/*showAllActiveFilters*/ ctx[5] && create_if_block_5(ctx);
    	let if_block5 = /*showAllActiveFilters*/ ctx[5] && create_if_block_4(ctx);
    	let each_value_1 = /*$activeTagFilters*/ ctx[11]?.[/*$filterOptions*/ ctx[8]?.filterSelection?.[/*$filterOptions*/ ctx[8]?.filterSelection?.findIndex(func_3)]?.filterSelectionName] || [];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*optionName*/ ctx[101] + /*optionIdx*/ ctx[102] + (/*optionType*/ ctx[108] ?? "");
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	function select_block_type_9(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[8]) return create_if_block$2;
    		return create_else_block;
    	}

    	let current_block_type_2 = select_block_type_9(ctx);
    	let if_block6 = current_block_type_2(ctx);
    	const default_slot_template = /*#slots*/ ctx[36].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[35], null);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			div4 = element("div");
    			input = element("input");
    			t2 = space();
    			div2 = element("div");
    			i0 = element("i");
    			t3 = space();
    			div1 = element("div");
    			if (if_block2) if_block2.c();
    			t4 = space();
    			div3 = element("div");
    			i1 = element("i");
    			t5 = space();
    			div5 = element("div");
    			if_block3.c();
    			t6 = space();
    			div8 = element("div");
    			if (if_block4) if_block4.c();
    			t7 = space();
    			div6 = element("div");
    			if (if_block5) if_block5.c();
    			t8 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t9 = space();
    			div7 = element("div");
    			i2 = element("i");
    			t10 = space();
    			if_block6.c();
    			t11 = space();
    			if (default_slot) default_slot.c();
    			attr_dev(div0, "class", "home-status svelte-1ss454j");
    			add_location(div0, file$2, 1293, 4, 52658);
    			attr_dev(input, "id", "input-search");
    			attr_dev(input, "class", "input-search svelte-1ss454j");
    			attr_dev(input, "type", "search");
    			attr_dev(input, "enterkeyhint", "search");
    			attr_dev(input, "autocomplete", "off");
    			attr_dev(input, "placeholder", "Search");
    			add_location(input, file$2, 1320, 8, 53580);
    			attr_dev(i0, "class", "input-search-wrap-icon fa-solid fa-sliders svelte-1ss454j");
    			attr_dev(i0, "tabindex", i0_tabindex_value = /*selectedFilterTypeElement*/ ctx[3] ? "" : "0");
    			add_location(i0, file$2, 1331, 12, 53955);

    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty("options-wrap " + (/*selectedFilterTypeElement*/ ctx[3]
    			? ""
    			: "disable-interaction hide")) + " svelte-1ss454j"));

    			set_style(div1, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			add_location(div1, file$2, 1338, 12, 54274);
    			attr_dev(div2, "class", "filterType svelte-1ss454j");
    			add_location(div2, file$2, 1329, 8, 53849);
    			attr_dev(i1, "class", "" + (null_to_empty("showFilterOptions fa-solid fa-filter") + " svelte-1ss454j"));
    			attr_dev(i1, "tabindex", "0");
    			add_location(i1, file$2, 1394, 12, 56990);
    			attr_dev(div3, "class", "showFilterOptions-container svelte-1ss454j");
    			add_location(div3, file$2, 1392, 8, 56867);
    			attr_dev(div4, "class", "input-search-wrap svelte-1ss454j");
    			add_location(div4, file$2, 1319, 4, 53539);

    			attr_dev(div5, "class", div5_class_value = "" + (null_to_empty("filters " + (/*showFilterOptions*/ ctx[6]
    			? ""
    			: "disable-interaction") + (/*$hasWheel*/ ctx[15] ? " hasWheel" : "")) + " svelte-1ss454j"));

    			attr_dev(div5, "id", "filters");
    			set_style(div5, "--maxPaddingHeight", /*maxFilterSelectionHeight*/ ctx[2] + 65 + "px");
    			add_location(div5, file$2, 1403, 4, 57294);
    			attr_dev(div6, "id", "tagFilters");
    			attr_dev(div6, "class", "tagFilters svelte-1ss454j");
    			set_style(div6, "max-height", /*showAllActiveFilters*/ ctx[5] ? "200px" : "30px");
    			add_location(div6, file$2, 1710, 8, 74714);
    			attr_dev(i2, "class", i2_class_value = "" + (null_to_empty("icon fa-solid fa-angle-" + (/*showAllActiveFilters*/ ctx[5] ? "up" : "down")) + " svelte-1ss454j"));
    			add_location(i2, file$2, 1803, 12, 78693);
    			attr_dev(div7, "tabindex", "0");
    			attr_dev(div7, "class", "showHideActiveFilters svelte-1ss454j");
    			add_location(div7, file$2, 1797, 8, 78467);
    			attr_dev(div8, "class", div8_class_value = "" + (null_to_empty("activeFilters" + (/*showAllActiveFilters*/ ctx[5] ? " seenMore" : "")) + " svelte-1ss454j"));
    			add_location(div8, file$2, 1698, 4, 74241);
    			attr_dev(main, "id", "main-home");
    			attr_dev(main, "class", "svelte-1ss454j");
    			set_style(main, "--filters-space", /*showFilterOptions*/ ctx[6] ? "80px" : "");
    			add_location(main, file$2, 1289, 0, 52563);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			if_block0.m(div0, null);
    			append_dev(div0, t0);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(main, t1);
    			append_dev(main, div4);
    			append_dev(div4, input);
    			set_input_value(input, /*$searchedAnimeKeyword*/ ctx[13]);
    			append_dev(div4, t2);
    			append_dev(div4, div2);
    			append_dev(div2, i0);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, i1);
    			append_dev(main, t5);
    			append_dev(main, div5);
    			if_block3.m(div5, null);
    			append_dev(main, t6);
    			append_dev(main, div8);
    			if (if_block4) if_block4.m(div8, null);
    			append_dev(div8, t7);
    			append_dev(div8, div6);
    			if (if_block5) if_block5.m(div6, null);
    			append_dev(div6, t8);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div6, null);
    				}
    			}

    			append_dev(div8, t9);
    			append_dev(div8, div7);
    			append_dev(div7, i2);
    			append_dev(main, t10);
    			if_block6.m(main, null);
    			append_dev(main, t11);

    			if (default_slot) {
    				default_slot.m(main, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[38]),
    					listen_dev(i0, "click", /*handleShowFilterTypes*/ ctx[19], false, false, false, false),
    					listen_dev(i0, "keydown", /*keydown_handler*/ ctx[39], false, false, false, false),
    					listen_dev(i1, "click", /*handleShowFilterOptions*/ ctx[32], false, false, false, false),
    					listen_dev(i1, "keydown", /*keydown_handler_3*/ ctx[42], false, false, false, false),
    					listen_dev(div5, "wheel", /*wheel_handler_2*/ ctx[56], { passive: true }, false, false, false),
    					listen_dev(div7, "click", /*handleShowActiveFilters*/ ctx[33], false, false, false, false),
    					listen_dev(div7, "keydown", /*keydown_handler_13*/ ctx[63], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, t0);
    				}
    			}

    			if (/*$dataStatus*/ ctx[12] || !/*$username*/ ctx[14]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$dataStatus, $username*/ 20480) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_16(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div0, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*$searchedAnimeKeyword*/ 8192 && input.value !== /*$searchedAnimeKeyword*/ ctx[13]) {
    				set_input_value(input, /*$searchedAnimeKeyword*/ ctx[13]);
    			}

    			if (!current || dirty[0] & /*selectedFilterTypeElement*/ 8 && i0_tabindex_value !== (i0_tabindex_value = /*selectedFilterTypeElement*/ ctx[3] ? "" : "0")) {
    				attr_dev(i0, "tabindex", i0_tabindex_value);
    			}

    			if (/*$filterOptions*/ ctx[8]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_15(ctx);
    					if_block2.c();
    					if_block2.m(div1, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!current || dirty[0] & /*selectedFilterTypeElement*/ 8 && div1_class_value !== (div1_class_value = "" + (null_to_empty("options-wrap " + (/*selectedFilterTypeElement*/ ctx[3]
    			? ""
    			: "disable-interaction hide")) + " svelte-1ss454j"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 4 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[2]}px`)) {
    				set_style(div1, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_2(ctx)) && if_block3) {
    				if_block3.p(ctx, dirty);
    			} else {
    				if_block3.d(1);
    				if_block3 = current_block_type_1(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(div5, null);
    				}
    			}

    			if (!current || dirty[0] & /*showFilterOptions, $hasWheel*/ 32832 && div5_class_value !== (div5_class_value = "" + (null_to_empty("filters " + (/*showFilterOptions*/ ctx[6]
    			? ""
    			: "disable-interaction") + (/*$hasWheel*/ ctx[15] ? " hasWheel" : "")) + " svelte-1ss454j"))) {
    				attr_dev(div5, "class", div5_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 4) {
    				set_style(div5, "--maxPaddingHeight", /*maxFilterSelectionHeight*/ ctx[2] + 65 + "px");
    			}

    			if (!/*showAllActiveFilters*/ ctx[5]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_5(ctx);
    					if_block4.c();
    					if_block4.m(div8, t7);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*showAllActiveFilters*/ ctx[5]) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_4(ctx);
    					if_block5.c();
    					if_block5.m(div6, t8);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (dirty[0] & /*$activeTagFilters, $filterOptions, changeActiveSelect, removeActiveTag*/ 100665600) {
    				each_value_1 = /*$activeTagFilters*/ ctx[11]?.[/*$filterOptions*/ ctx[8]?.filterSelection?.[/*$filterOptions*/ ctx[8]?.filterSelection?.findIndex(func_3)]?.filterSelectionName] || [];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div6, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
    				check_outros();
    			}

    			if (dirty[0] & /*showAllActiveFilters*/ 32) {
    				set_style(div6, "max-height", /*showAllActiveFilters*/ ctx[5] ? "200px" : "30px");
    			}

    			if (!current || dirty[0] & /*showAllActiveFilters*/ 32 && i2_class_value !== (i2_class_value = "" + (null_to_empty("icon fa-solid fa-angle-" + (/*showAllActiveFilters*/ ctx[5] ? "up" : "down")) + " svelte-1ss454j"))) {
    				attr_dev(i2, "class", i2_class_value);
    			}

    			if (!current || dirty[0] & /*showAllActiveFilters*/ 32 && div8_class_value !== (div8_class_value = "" + (null_to_empty("activeFilters" + (/*showAllActiveFilters*/ ctx[5] ? " seenMore" : "")) + " svelte-1ss454j"))) {
    				attr_dev(div8, "class", div8_class_value);
    			}

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_9(ctx)) && if_block6) {
    				if_block6.p(ctx, dirty);
    			} else {
    				if_block6.d(1);
    				if_block6 = current_block_type_2(ctx);

    				if (if_block6) {
    					if_block6.c();
    					if_block6.m(main, t11);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[1] & /*$$scope*/ 16)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[35],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[35])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[35], dirty, null),
    						null
    					);
    				}
    			}

    			if (dirty[0] & /*showFilterOptions*/ 64) {
    				set_style(main, "--filters-space", /*showFilterOptions*/ ctx[6] ? "80px" : "");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if_block6.d();
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function hasPartialMatch(strings, searchString) {
    	if (typeof strings === "string" && typeof searchString === "string") {
    		return strings.toLowerCase().includes(searchString.trim().toLowerCase());
    	}
    }

    function horizontalWheel(event, parentClass) {
    	let element = event.target;
    	let classList = element.classList;

    	if (!classList.contains(parentClass)) {
    		element = element.closest("." + parentClass);
    	}

    	if (element.scrollWidth <= element.clientWidth) return;

    	if (event.deltaY !== 0 && event.deltaX === 0) {
    		element.scrollLeft = Math.max(0, element.scrollLeft + event.deltaY);
    	}
    }

    const func = ({ sortType }) => sortType !== "none";
    const func_2 = ({ isSelected }) => isSelected;

    const wheel_handler = () => {
    	
    };

    const wheel_handler_1 = () => {
    	
    };

    const func_3 = ({ isSelected }) => isSelected;
    const func_4 = ({ sortType }) => sortType !== "none";
    const func_5 = ({ sortType }) => sortType !== "none";
    const func_6 = ({ sortType }) => sortType !== "none";

    function instance$2($$self, $$props, $$invalidate) {
    	let $confirmPromise;
    	let $filterOptions;
    	let $animeLoaderWorker;
    	let $checkAnimeLoaderStatus;
    	let $finalAnimeList;
    	let $gridFullView;
    	let $initData;
    	let $activeTagFilters;
    	let $dataStatus;
    	let $numberOfNextLoadedGrid;
    	let $hiddenEntries;
    	let $searchedAnimeKeyword;
    	let $isImporting;
    	let $username;
    	let $hasWheel;
    	let $android;
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(78, $confirmPromise = $$value));
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(8, $filterOptions = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(79, $animeLoaderWorker = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(80, $checkAnimeLoaderStatus = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(81, $finalAnimeList = $$value));
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(9, $gridFullView = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(10, $initData = $$value));
    	validate_store(activeTagFilters, 'activeTagFilters');
    	component_subscribe($$self, activeTagFilters, $$value => $$invalidate(11, $activeTagFilters = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(12, $dataStatus = $$value));
    	validate_store(numberOfNextLoadedGrid, 'numberOfNextLoadedGrid');
    	component_subscribe($$self, numberOfNextLoadedGrid, $$value => $$invalidate(82, $numberOfNextLoadedGrid = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(83, $hiddenEntries = $$value));
    	validate_store(searchedAnimeKeyword, 'searchedAnimeKeyword');
    	component_subscribe($$self, searchedAnimeKeyword, $$value => $$invalidate(13, $searchedAnimeKeyword = $$value));
    	validate_store(isImporting, 'isImporting');
    	component_subscribe($$self, isImporting, $$value => $$invalidate(84, $isImporting = $$value));
    	validate_store(username, 'username');
    	component_subscribe($$self, username, $$value => $$invalidate(14, $username = $$value));
    	validate_store(hasWheel, 'hasWheel');
    	component_subscribe($$self, hasWheel, $$value => $$invalidate(15, $hasWheel = $$value));
    	validate_store(android, 'android');
    	component_subscribe($$self, android, $$value => $$invalidate(16, $android = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Search', slots, ['default']);
    	let Init = true;
    	let windowWidth = window.visualViewport.width;
    	let windowHeight = window.visualViewport.height;
    	let maxFilterSelectionHeight = windowHeight * 0.3;
    	let selectedFilterTypeElement;
    	let selectedFilterElement;
    	let selectedSortElement;
    	let highlightedEl;
    	let filterScrollTimeout;
    	let filterIsScrolling;
    	let showAllActiveFilters = false;
    	let showFilterOptions = false;
    	let nameChangeUpdateProcessedList = ["Algorithm Filter"];
    	let nameChangeUpdateFinalList = ["sort", "Anime Filter", "Content Caution"];
    	let conditionalInputNumberList = ["weighted score", "score", "average score", "user score", "popularity"];
    	let isUpdatingRec = false, isLoadingAnime = false;

    	async function saveFilters(changeName) {
    		if ($initData) return;

    		if (nameChangeUpdateProcessedList.includes(changeName)) {
    			isUpdatingRec = true;
    			set_store_value(dataStatus, $dataStatus = "Updating List", $dataStatus);
    			_processRecommendedAnimeList();
    		} else if (nameChangeUpdateFinalList.includes(changeName)) {
    			isLoadingAnime = true;
    			set_store_value(dataStatus, $dataStatus = "Updating List", $dataStatus);
    			_loadAnime();
    		} else if (!isLoadingAnime && !isUpdatingRec && !$isImporting) {
    			await saveJSON($filterOptions, "filterOptions");
    			await saveJSON($activeTagFilters, "activeTagFilters");
    		}
    	}

    	function _loadAnime() {
    		if ($animeLoaderWorker) {
    			$animeLoaderWorker.terminate();
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    		}

    		animeLoader({
    			filterOptions: $filterOptions,
    			activeTagFilters: $activeTagFilters
    		}).then(async data => {
    			isUpdatingRec = isLoadingAnime = false;
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);
    			set_store_value(searchedAnimeKeyword, $searchedAnimeKeyword = "", $searchedAnimeKeyword);

    			if (data?.isNew) {
    				set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
    				set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries, $hiddenEntries);
    				set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid, $numberOfNextLoadedGrid);
    			}

    			set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    			return;
    		}).catch(error => {
    			throw error;
    		});
    	}

    	async function _processRecommendedAnimeList() {
    		await saveJSON(true, "shouldProcessRecommendation");

    		processRecommendedAnimeList({
    			filterOptions: $filterOptions,
    			activeTagFilters: $activeTagFilters
    		}).then(async () => {
    			await saveJSON(false, "shouldProcessRecommendation");
    			updateFilters.update(e => !e);
    			_loadAnime();
    		}).catch(error => {
    			_loadAnime();
    			throw error;
    		});
    	}

    	async function scrollToFirstTagFilter() {
    		let parentEl = document.getElementById("tagFilters");
    		await tick();

    		if (parentEl instanceof Element) {
    			parentEl.scrollTop = 0;
    		}
    	}

    	async function scrollToFirstFilter() {
    		let parentEl = document.getElementById("filters");
    		await tick();

    		if (parentEl instanceof Element) {
    			parentEl.scrollLeft = 0;
    		}
    	}

    	function windowResized() {
    		windowHeight = window.visualViewport.height;
    		$$invalidate(2, maxFilterSelectionHeight = windowHeight * 0.3);
    		$$invalidate(1, windowWidth = window.visualViewport.width);
    	}

    	async function handleFilterTypes(newFilterTypeName) {
    		if ($initData) return pleaseWaitAlert();
    		let idxTypeSelected = $filterOptions?.filterSelection.findIndex(({ isSelected }) => isSelected);
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;

    		if (nameTypeSelected !== newFilterTypeName) {
    			// Close Filter Dropdown
    			$$invalidate(4, selectedSortElement = false);

    			// Reload Anime for Async Animation
    			if ($finalAnimeList?.length > 36 && !$gridFullView) {
    				await callAsyncAnimeReload();
    			}

    			// Close Filter Selection Dropdown
    			$filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown.forEach(e => {
    				e.selected = false;
    			});

    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    			selectedFilterElement = null;

    			// Change Filter Type
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].isSelected = false, $filterOptions);

    			let newIdxFilterTypeSelected = $filterOptions?.filterSelection?.findIndex(({ filterSelectionName }) => filterSelectionName === newFilterTypeName);
    			set_store_value(filterOptions, $filterOptions.filterSelection[newIdxFilterTypeSelected].isSelected = true, $filterOptions);
    			scrollToFirstFilter();
    			scrollToFirstTagFilter();
    			saveFilters();
    		}

    		if (highlightedEl instanceof Element && highlightedEl.closest(".filterType")) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		$$invalidate(3, selectedFilterTypeElement = false);
    	}

    	function handleShowFilterTypes(event) {
    		if ($initData && ($filterOptions?.filterSelection?.length ?? 0) < 1) {
    			return pleaseWaitAlert();
    		}

    		let element = event.target;
    		let classList = element.classList;
    		let filterTypEl = element.closest(".filterType");
    		let optionsWrap = element.closest(".options-wrap");

    		if ((classList.contains("filterType") || filterTypEl) && !selectedFilterTypeElement) {
    			$$invalidate(3, selectedFilterTypeElement = true);
    		} else if ((!optionsWrap || classList.contains("closing-x")) && !classList.contains("options-wrap")) {
    			if (highlightedEl instanceof Element && highlightedEl.closest(".filterType")) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}

    			$$invalidate(3, selectedFilterTypeElement = false);
    		}
    	}

    	function handleFilterScroll() {
    		if (filterScrollTimeout) clearTimeout(filterScrollTimeout);
    		filterIsScrolling = true;

    		filterScrollTimeout = setTimeout(
    			() => {
    				filterIsScrolling = false;
    			},
    			300
    		);
    	}

    	function filterSelect(event, dropdownIdx) {
    		if (filterIsScrolling && event.pointerType === "mouse") return;
    		let element = event.target;
    		let filSelectEl = element.closest(".filter-select");
    		if (filSelectEl === selectedFilterElement) return;
    		let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);

    		if (selectedFilterElement instanceof Element) {
    			let filterSelectChildrenArray = Array.from(selectedFilterElement.parentElement.children).filter(el => {
    				return !el.classList.contains("disable-interaction");
    			});

    			let selectedIndex = filterSelectChildrenArray.indexOf(selectedFilterElement);
    			if (element.classList.contains("icon") && !element.classList.contains("fa-angle-down") && $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[selectedIndex].selected) return;
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[selectedIndex].selected = false, $filterOptions);
    		}

    		if (Init) $$invalidate(0, Init = false);

    		if (highlightedEl instanceof Element && highlightedEl.closest(".filter-select")) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].selected = true, $filterOptions);
    		selectedFilterElement = filSelectEl;
    	}

    	function closeFilterSelect(dropDownIdx) {
    		let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
    		set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropDownIdx].selected = false, $filterOptions);

    		if (highlightedEl instanceof Element && highlightedEl.closest(".filter-select")) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		selectedFilterElement = null;
    	}

    	async function clickOutsideListener(event) {
    		if ($filterOptions?.filterSelection?.length < 1 || !$filterOptions) return;
    		let element = event.target;
    		let classList = element.classList;

    		if (classList.contains("options-wrap") && getComputedStyle(element).position === "fixed") {
    			// Small Screen Width
    			if (highlightedEl instanceof Element) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}

    			// Close Filter Type Dropdown
    			$$invalidate(3, selectedFilterTypeElement = false);

    			// Close Sort Filter Dropdown
    			$$invalidate(4, selectedSortElement = false);

    			// Close Filter Selection Dropdown
    			let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);

    			$filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown.forEach(e => {
    				e.selected = false;
    			});

    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    			selectedFilterElement = null;
    		} else if (!classList.contains("options-wrap") && !element.closest(".options-wrap") && !classList.contains("async-element")) {
    			// Large Screen Width
    			// Filter Type Dropdown
    			let filterTypeEl = element.closest(".filterType");

    			if (!classList.contains("filterType") && !filterTypeEl) {
    				if (highlightedEl instanceof Element && highlightedEl.closest(".filterType")) {
    					removeClass(highlightedEl, "highlight");
    					highlightedEl = null;
    				}

    				$$invalidate(3, selectedFilterTypeElement = false);
    			}

    			// Sort Filter Dropdown
    			let sortSelectEl = element.closest(".sortFilter");

    			if (!classList.contains("sortFilter") && !sortSelectEl) {
    				if (highlightedEl instanceof Element && highlightedEl.closest(".sortFilter")) {
    					removeClass(highlightedEl, "highlight");
    					highlightedEl = null;
    				}

    				$$invalidate(4, selectedSortElement = false);
    			}

    			// Filter Selection Dropdown
    			let inputDropdownSelectEl = element.closest(".select");

    			if (!classList.contains("select") && !classList.contains("fa-angle-down") && !inputDropdownSelectEl) {
    				if (highlightedEl instanceof Element && highlightedEl.closest(".filter-select")) {
    					removeClass(highlightedEl, "highlight");
    					highlightedEl = null;
    				}

    				let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);

    				$filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown.forEach(e => {
    					e.selected = false;
    				});

    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    				selectedFilterElement = null;
    			}
    		}
    	}

    	function handleFilterSelectOptionChange(
    		optionName,
    	optionType,
    	optionIdx,
    	dropdownIdx,
    	changeType,
    	filterSelectionName
    	) {
    		if ($initData) return pleaseWaitAlert();
    		let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;
    		let currentValue = $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected;

    		if (currentValue === "none" || currentValue === true || changeType === "read" && currentValue !== "included") {
    			// true is default value of selections
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "included", $filterOptions);

    			set_store_value(
    				activeTagFilters,
    				$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => {
    					return e.optionName + e.optionIdx + e.optionType !== optionName + optionIdx + optionType;
    				}),
    				$activeTagFilters
    			);

    			$activeTagFilters[nameTypeSelected].unshift({
    				optionName,
    				optionType,
    				optionIdx,
    				categIdx: dropdownIdx,
    				selected: "included",
    				changeType,
    				filterType: "dropdown"
    			});

    			activeTagFilters.set($activeTagFilters);
    		} else if (currentValue === "included") {
    			if (changeType === "read") {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "none", $filterOptions);
    				set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === "dropdown" && e.categIdx === dropdownIdx && (e.optionType ? e.optionType === optionType : true))), $activeTagFilters);
    			} else {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "excluded", $filterOptions);

    				set_store_value(
    					activeTagFilters,
    					$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
    						if (e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === "dropdown" && e.categIdx === dropdownIdx && e.selected === "included" && e.optionType === optionType) {
    							e.selected = "excluded";
    						}

    						return e;
    					}),
    					$activeTagFilters
    				);
    			}
    		} else {
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "none", $filterOptions);
    			set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === "dropdown" && e.categIdx === dropdownIdx && e.optionType === optionType)), $activeTagFilters);
    		}

    		saveFilters(filterSelectionName);
    	}

    	function handleCheckboxChange(event, checkBoxName, checkboxIdx, filterSelectionName) {
    		let element = event.target;
    		let classList = element.classList;
    		let keyCode = event.which || event.keyCode || 0;

    		if (classList.contains("checkbox") && event.type === "click" || classList.contains("checkbox") && keyCode !== 13 && event.type === "keydown" || filterIsScrolling && event.pointerType === "mouse") {
    			return;
    		}

    		if ($initData) {
    			if (!classList.contains("checkbox")) {
    				pleaseWaitAlert();
    			}

    			return;
    		}

    		// Prevent Default
    		let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);

    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;
    		let currentCheckBoxStatus = $filterOptions?.filterSelection?.[idxTypeSelected].filters.Checkbox[checkboxIdx].isSelected;

    		if (currentCheckBoxStatus) {
    			set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === checkboxIdx && e.optionName === checkBoxName && e.filterType === "checkbox" && e.selected === "included")), $activeTagFilters);
    		} else {
    			set_store_value(
    				activeTagFilters,
    				$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => {
    					return e.optionName + e.optionIdx !== checkBoxName + checkboxIdx;
    				}),
    				$activeTagFilters
    			);

    			$activeTagFilters[nameTypeSelected].unshift({
    				optionName: checkBoxName,
    				optionIdx: checkboxIdx,
    				filterType: "checkbox",
    				selected: "included",
    				changeType: "read"
    			});

    			activeTagFilters.set($activeTagFilters);
    		}

    		set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[checkboxIdx].isSelected = !$filterOptions?.filterSelection?.[idxTypeSelected].filters.Checkbox[checkboxIdx].isSelected, $filterOptions);
    		saveFilters(filterSelectionName);
    	}

    	function handleInputNumber(
    		event,
    	newValue,
    	inputNumIdx,
    	inputNumberName,
    	maxValue,
    	minValue,
    	filterSelectionName
    	) {
    		if ($initData) return pleaseWaitAlert();
    		let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;
    		let currentValue = $filterOptions?.filterSelection?.[idxTypeSelected].filters["Input Number"][inputNumIdx].numberValue;

    		if (conditionalInputNumberList.includes(inputNumberName) && (/^(>=|<=|<|>).*($)/).test(newValue)) {
    			let newSplitValue = newValue.split(/(<=|>=|<|>)/).filter(e => e); // Check if it starts or ends with comparison operators
    			// Remove White Space

    			if (newValue !== currentValue && newSplitValue.length <= 2) {
    				let currentSplitValue = newValue.split(/(<=|>=|<|>)/).filter(e => e); // Remove White Space
    				let newCMPOperator, newCMPNumber;

    				if (newSplitValue[0].includes(">") || newSplitValue[0].includes("<")) {
    					newCMPOperator = newSplitValue[0];
    					newCMPNumber = newSplitValue[1];
    				} else {
    					newCMPOperator = newSplitValue[1];
    					newCMPNumber = newSplitValue[0];
    				}

    				if (currentSplitValue[0].includes(">") || currentSplitValue[0].includes("<")) {
    					currentSplitValue[0];
    					currentSplitValue[1];
    				} else {
    					currentSplitValue[1];
    					currentSplitValue[0];
    				}

    				if (newValue !== currentValue && (!isNaN(newCMPNumber) && (parseFloat(newCMPNumber) >= minValue || typeof minValue !== "number") && (parseFloat(newCMPNumber) <= maxValue || typeof maxValue !== "number") || !newCMPNumber)) {
    					if (!newCMPNumber) {
    						set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === inputNumIdx && e.optionName === inputNumberName && e.optionValue === currentValue && e.filterType === "input number")), $activeTagFilters);
    					} else {
    						let elementIdx = $activeTagFilters[nameTypeSelected].findIndex(item => item.optionName === inputNumberName && item.optionValue === currentValue && item.optionIdx === inputNumIdx && item.filterType === "input number");

    						if (elementIdx === -1) {
    							set_store_value(
    								activeTagFilters,
    								$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => {
    									return e.optionName + e.optionIdx !== inputNumberName + inputNumIdx;
    								}),
    								$activeTagFilters
    							);

    							$activeTagFilters[nameTypeSelected].unshift({
    								optionName: inputNumberName,
    								optionValue: newValue,
    								CMPoperator: newCMPOperator,
    								CMPNumber: newCMPNumber,
    								optionIdx: inputNumIdx,
    								filterType: "input number",
    								selected: "included",
    								changeType: "read"
    							});
    						} else {
    							$activeTagFilters[nameTypeSelected].splice(elementIdx, 1);

    							set_store_value(
    								activeTagFilters,
    								$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => {
    									return e.optionName + e.optionIdx !== inputNumberName + inputNumIdx;
    								}),
    								$activeTagFilters
    							);

    							$activeTagFilters[nameTypeSelected].unshift({
    								optionName: inputNumberName,
    								optionValue: newValue,
    								CMPoperator: newCMPOperator,
    								CMPNumber: newCMPNumber,
    								optionIdx: inputNumIdx,
    								filterType: "input number",
    								selected: "included",
    								changeType: "read"
    							});
    						}

    						activeTagFilters.set($activeTagFilters);
    					}

    					set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters["Input Number"][inputNumIdx].numberValue = newValue, $filterOptions);
    					saveFilters(filterSelectionName);
    				} else {
    					changeInputValue(event.target, currentValue);
    				}
    			} else {
    				let elementIdx = $activeTagFilters[nameTypeSelected].findIndex(item => item.optionName === inputNumberName && item.optionValue === currentValue && item.optionIdx === inputNumIdx && item.filterType === "input number");

    				if (elementIdx >= 0) {
    					set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected][elementIdx].selected = "included", $activeTagFilters);
    				}

    				changeInputValue(event.target, currentValue);
    			}
    		} else {
    			if (newValue !== currentValue && (!isNaN(newValue) && (parseFloat(newValue) >= minValue || typeof minValue !== "number") && (parseFloat(newValue) <= maxValue || typeof maxValue !== "number") || newValue === "")) {
    				if (newValue === "") {
    					set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === inputNumIdx && e.optionName === inputNumberName && e.optionValue === currentValue && e.filterType === "input number")), $activeTagFilters);
    				} else {
    					let elementIdx = $activeTagFilters[nameTypeSelected].findIndex(item => item.optionName === inputNumberName && item.optionValue === currentValue && item.optionIdx === inputNumIdx && item.filterType === "input number");

    					if (elementIdx === -1) {
    						set_store_value(
    							activeTagFilters,
    							$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => {
    								return e.optionName + e.optionIdx !== inputNumberName + inputNumIdx;
    							}),
    							$activeTagFilters
    						);

    						$activeTagFilters[nameTypeSelected].unshift({
    							optionName: inputNumberName,
    							optionValue: newValue,
    							optionIdx: inputNumIdx,
    							filterType: "input number",
    							selected: "included",
    							changeType: "read"
    						});
    					} else {
    						$activeTagFilters[nameTypeSelected].splice(elementIdx, 1);

    						set_store_value(
    							activeTagFilters,
    							$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => {
    								return e.optionName + e.optionIdx !== inputNumberName + inputNumIdx;
    							}),
    							$activeTagFilters
    						);

    						$activeTagFilters[nameTypeSelected].unshift({
    							optionName: inputNumberName,
    							optionValue: newValue,
    							optionIdx: inputNumIdx,
    							filterType: "input number",
    							selected: "included",
    							changeType: "read"
    						});
    					}

    					activeTagFilters.set($activeTagFilters);
    				}

    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters["Input Number"][inputNumIdx].numberValue = newValue, $filterOptions);
    				saveFilters(filterSelectionName);
    			} else {
    				if (elementIdx >= 0) {
    					set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected][elementIdx].selected = "included", $activeTagFilters);
    				}

    				changeInputValue(event.target, currentValue);
    			}
    		}
    	}

    	function changeActiveSelect(
    		event,
    	optionIdx,
    	optionName,
    	filterType,
    	categIdx,
    	changeType,
    	optionType,
    	optionValue
    	) {
    		if ($initData) return pleaseWaitAlert();
    		let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;

    		if (filterType === "input number") {
    			let elementIdx = $activeTagFilters[nameTypeSelected].findIndex(item => item.optionName === optionName && item.optionValue === optionValue && item.optionIdx === optionIdx && item.filterType === "input number");

    			if (elementIdx >= 0) {
    				let currentSelect = $activeTagFilters[nameTypeSelected][elementIdx].selected;

    				if (currentSelect === "included") {
    					set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected][elementIdx].selected = "excluded", $activeTagFilters);
    				} else {
    					set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected][elementIdx].selected = "included", $activeTagFilters);
    				}
    			}
    		} else if (filterType === "checkbox") {
    			let tagFilterIdx = $activeTagFilters[nameTypeSelected].findIndex(e => e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === filterType);
    			let checkboxSelection = $activeTagFilters?.[nameTypeSelected]?.[tagFilterIdx]?.selected;

    			if (checkboxSelection === "included") {
    				set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected][tagFilterIdx].selected = "excluded", $activeTagFilters);
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[optionIdx].isSelected = false, $filterOptions);
    			} else if (checkboxSelection === "excluded") {
    				set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected][tagFilterIdx].selected = "included", $activeTagFilters);
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[optionIdx].isSelected = true, $filterOptions);
    			}
    		} else if (filterType === "dropdown") {
    			let currentSelect = $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected;

    			if (currentSelect === "included") {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected = "excluded", $filterOptions);

    				set_store_value(
    					activeTagFilters,
    					$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
    						if (e.optionIdx === optionIdx && e.optionName === optionName && e.selected === "included" && (e.optionType ? e.optionType === optionType : true)) {
    							e.selected = "excluded";
    						}

    						return e;
    					}),
    					$activeTagFilters
    				);
    			} else if (currentSelect === "excluded") {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected = "included", $filterOptions);

    				set_store_value(
    					activeTagFilters,
    					$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
    						if (e.optionIdx === optionIdx && e.optionName === optionName && e.selected === "excluded" && (e.optionType ? e.optionType === optionType : true)) {
    							e.selected = "included";
    						}

    						return e;
    					}),
    					$activeTagFilters
    				);
    			}
    		}

    		saveFilters(nameTypeSelected);
    	}

    	function removeActiveTag(event, optionIdx, optionName, filterType, categIdx, optionType) {
    		if ($initData) return pleaseWaitAlert();
    		let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;

    		if (filterType === "checkbox") {
    			// Is Checkbox
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[optionIdx].isSelected = false, $filterOptions);
    		} else if (filterType === "input number") {
    			// Is Input Number
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters["Input Number"][optionIdx].numberValue = "", $filterOptions);
    		} else {
    			// Is Only Read optionName
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected = "none", $filterOptions);
    		}

    		set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionName === optionName && e.optionIdx === optionIdx && e.filterType === filterType && (e.optionType ? e.optionType === optionType : true))), $activeTagFilters);
    		saveFilters(nameTypeSelected);
    	}

    	async function removeAllActiveTag(event) {
    		if ($initData) return pleaseWaitAlert();
    		let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;
    		let hasActiveFilter = $activeTagFilters?.[nameTypeSelected]?.length;

    		if (hasActiveFilter && await $confirmPromise("Do you want to remove all filters?")) {
    			// Remove Active Number Input
    			$filterOptions?.filterSelection?.[idxTypeSelected].filters["Input Number"].forEach(e => {
    				e.numberValue = "";
    			});

    			// Remove Checkbox
    			$filterOptions?.filterSelection?.[idxTypeSelected].filters.Checkbox.forEach(e => {
    				e.isSelected = false;
    			});

    			// Remove Dropdown
    			$filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown.forEach(({ options }, dropdownIdx) => {
    				options.forEach(({ selected }, optionsIdx) => {
    					selected = "none";
    					set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionsIdx].selected = selected, $filterOptions);
    				});
    			});

    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    			set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = [], $activeTagFilters);
    			saveFilters(nameTypeSelected);
    		}
    	}

    	function handleSortFilterPopup(event) {
    		let element = event.target;
    		let classList = element.classList;
    		let sortSelectEl = element.closest(".sortFilter");
    		let optionsWrap = element.closest(".options-wrap");

    		if ((classList.contains("sortFilter") || sortSelectEl) && !selectedSortElement) {
    			$$invalidate(4, selectedSortElement = true);
    		} else if ((!optionsWrap || classList.contains("closing-x")) && !classList.contains("options-wrap")) {
    			if (highlightedEl instanceof Element && highlightedEl.closest(".sortFilter")) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}

    			$$invalidate(4, selectedSortElement = false);
    		}
    	}

    	function changeSort(newSortName) {
    		if ($initData) return pleaseWaitAlert();
    		let { sortName, sortType } = $filterOptions?.sortFilter?.filter(({ sortType }) => sortType !== "none")[0];
    		let idxSortSelected = $filterOptions?.sortFilter?.findIndex(({ sortType }) => sortType !== "none");

    		if (sortName === newSortName) {
    			let newSortType = sortType === "desc" ? "asc" : "desc";
    			set_store_value(filterOptions, $filterOptions.sortFilter[idxSortSelected].sortType = newSortType, $filterOptions);
    		} else if (sortName !== newSortName) {
    			set_store_value(filterOptions, $filterOptions.sortFilter[idxSortSelected].sortType = "none", $filterOptions);
    			let idxNewSortSelected = $filterOptions?.sortFilter?.findIndex(({ sortName }) => sortName === newSortName);
    			set_store_value(filterOptions, $filterOptions.sortFilter[idxNewSortSelected].sortType = "desc", $filterOptions);
    		}

    		saveFilters("sort");

    		if (highlightedEl instanceof Element && highlightedEl.closest(".sortFilter")) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		$$invalidate(4, selectedSortElement = false);
    	}

    	function changeSortType() {
    		if ($initData) return pleaseWaitAlert();
    		let { sortType } = $filterOptions?.sortFilter?.filter(({ sortType }) => sortType !== "none")[0];
    		let idxSortSelected = $filterOptions?.sortFilter?.findIndex(({ sortType }) => sortType !== "none");

    		if (sortType === "desc") {
    			set_store_value(filterOptions, $filterOptions.sortFilter[idxSortSelected].sortType = "asc", $filterOptions);
    		} else {
    			set_store_value(filterOptions, $filterOptions.sortFilter[idxSortSelected].sortType = "desc", $filterOptions);
    		}

    		saveFilters("sort");
    	}

    	function handleDropdownKeyDown(event) {
    		let keyCode = event.which || event.keyCode || 0;

    		// 38up 40down 13enter
    		if (keyCode == 38 || keyCode == 40) {
    			var element = Array.from(document.getElementsByClassName("options-wrap") || []).find(el => {
    				return !el.classList.contains("disable-interaction");
    			});

    			if (element?.closest?.(".filterType") || element?.closest?.(".sortFilter") || element?.closest?.(".filter-select")) {
    				event.preventDefault();

    				// handle sortFilter
    				if (highlightedEl instanceof Element && highlightedEl?.closest?.(".options")?.children?.length) {
    					let parent = highlightedEl.closest(".options");
    					let options = Array.from(parent.querySelectorAll(".option"));
    					let currentidx = options.indexOf(highlightedEl);
    					let nextEl, iteratedEl, firstEl, lastEl;

    					for (let idx = 0; idx < options.length; idx++) {
    						if (!options[idx].classList.contains("disable-interaction")) {
    							if (keyCode === 38) {
    								// Prev
    								lastEl = options[idx];

    								if (idx < currentidx) {
    									iteratedEl = options[idx];
    								} else if (iteratedEl) {
    									nextEl = iteratedEl;
    									break;
    								}
    							} else {
    								// next
    								if (!firstEl) {
    									firstEl = options[idx];
    								}

    								if (idx > currentidx) {
    									nextEl = options[idx];
    									break;
    								}
    							}
    						}
    					}

    					let isFirstOrLast = false;

    					if (!(nextEl instanceof Element)) {
    						if (firstEl instanceof Element) {
    							nextEl = firstEl;
    							isFirstOrLast = true;
    						} else if (lastEl instanceof Element) {
    							nextEl = lastEl;
    							isFirstOrLast = true;
    						}
    					}

    					if (nextEl instanceof Element) {
    						removeClass(highlightedEl, "highlight");
    						highlightedEl = nextEl;
    						addClass(highlightedEl, "highlight");

    						highlightedEl.scrollIntoView({
    							behavior: isFirstOrLast ? "auto" : "smooth",
    							container: parent,
    							block: "center",
    							inline: "nearest"
    						});
    					}
    				} else {
    					let options = element.querySelectorAll(".option:not(.disable-interaction)");
    					highlightedEl = options[0];

    					if (highlightedEl instanceof Element) {
    						addClass(highlightedEl, "highlight");

    						highlightedEl.scrollIntoView({
    							behavior: "smooth",
    							container: parent,
    							block: "center",
    							inline: "nearest"
    						});
    					}
    				}
    			}
    		} else if (keyCode === 13) {
    			if (highlightedEl instanceof Element) {
    				let keydownEvent = new KeyboardEvent("keydown", { key: "Enter" });
    				highlightedEl.dispatchEvent(keydownEvent);
    			}
    		} else {
    			var element = Array.from(document.getElementsByClassName("options-wrap") || []).find(el => !el.classList.contains("disable-interaction"));
    			if (element?.closest?.(".filter-select") && keyCode !== 9 || element instanceof Element && getComputedStyle(element).position === "fixed") return;
    			let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
    			$$invalidate(3, selectedFilterTypeElement = null);
    			$$invalidate(4, selectedSortElement = null);

    			if ($filterOptions?.filterSelection?.length > 0) {
    				$filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown.forEach(e => {
    					e.selected = false;
    				});

    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    			}

    			selectedFilterElement = null;

    			if (highlightedEl instanceof Element) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}
    		}
    	}

    	async function handleGridView() {
    		set_store_value(gridFullView, $gridFullView = !$gridFullView, $gridFullView);
    		saveIDBdata($gridFullView, "gridFullView");
    	}

    	async function handleShowFilterOptions(val = null) {
    		if ($finalAnimeList?.length > 36 && !$gridFullView) {
    			await callAsyncAnimeReload();
    		}

    		if (typeof val === "boolean") {
    			$$invalidate(6, showFilterOptions = val);
    		} else {
    			$$invalidate(6, showFilterOptions = !showFilterOptions);
    		}
    	}

    	async function handleShowActiveFilters(val = null) {
    		if ($finalAnimeList?.length > 36 && !$gridFullView) {
    			await callAsyncAnimeReload();
    		}

    		if (typeof val === "boolean") {
    			$$invalidate(5, showAllActiveFilters = val);
    		} else {
    			$$invalidate(5, showAllActiveFilters = !showAllActiveFilters);
    		}

    		scrollToFirstTagFilter();
    	}

    	let asyncAnimeReloadPromise;

    	function callAsyncAnimeReload() {
    		return new Promise(resolve => {
    				if ($animeLoaderWorker instanceof Worker) {
    					set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);

    					$checkAnimeLoaderStatus().then(() => {
    						$animeLoaderWorker.postMessage({ reload: true });
    					});
    				}

    				asyncAnimeReloadPromise = { resolve };
    			});
    	}

    	asyncAnimeReloaded.subscribe(val => {
    		if (typeof val !== "boolean") return;
    		asyncAnimeReloadPromise?.resolve?.();
    	});

    	window.checkOpenDropdown = () => {
    		return (selectedFilterElement || selectedFilterTypeElement || selectedSortElement) && window.visualViewport.width <= 425;
    	};

    	function closeDropdown() {
    		// Small Screen Width
    		if (highlightedEl instanceof Element) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		// Close Filter Type Dropdown
    		$$invalidate(3, selectedFilterTypeElement = false);

    		// Close Sort Filter Dropdown
    		$$invalidate(4, selectedSortElement = false);

    		// Close Filter Selection Dropdown
    		let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);

    		$filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown.forEach(e => {
    			e.selected = false;
    		});

    		set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    		selectedFilterElement = null;
    	}

    	window.closeDropdown = closeDropdown;

    	onMount(() => {
    		// Init
    		let filterEl = document.getElementById("filters");

    		filterEl.addEventListener("scroll", handleFilterScroll);
    		dragScroll(filterEl, "x");
    		document.addEventListener("keydown", handleDropdownKeyDown);
    		window.addEventListener("resize", windowResized);
    		window.addEventListener("click", clickOutsideListener);
    	});

    	function pleaseWaitAlert() {
    		$confirmPromise({
    			isAlert: true,
    			title: "Initializing resources",
    			text: "Please wait a moment..."
    		});
    	}

    	let scrollingToTop;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Search> was created with unknown prop '${key}'`);
    	});

    	const func_1 = (Dropdown, { optionName }) => hasPartialMatch(optionName, Dropdown.optKeyword) || Dropdown.optKeyword === "";

    	function input_input_handler() {
    		$searchedAnimeKeyword = this.value;
    		searchedAnimeKeyword.set($searchedAnimeKeyword);
    	}

    	const keydown_handler = e => e.key === "Enter" && handleShowFilterTypes(e);
    	const keydown_handler_1 = e => e.key === "Enter" && handleShowFilterTypes(e);
    	const keydown_handler_2 = (filterSelectionName, e) => e.key === "Enter" && handleFilterTypes(filterSelectionName);
    	const keydown_handler_3 = e => e.key === "Enter" && handleShowFilterOptions(e);

    	function input0_input_handler(filSelIdx, dropdownIdx) {
    		$filterOptions.filterSelection[filSelIdx].filters.Dropdown[dropdownIdx].optKeyword = this.value;
    		filterOptions.set($filterOptions);
    	}

    	const keydown_handler_4 = (dropdownIdx, e) => e.key === "Enter" && closeFilterSelect(dropdownIdx);
    	const keydown_handler_5 = (dropdownIdx, e) => (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") && filterSelect(e, dropdownIdx);
    	const click_handler = (dropdownIdx, e) => filterSelect(e, dropdownIdx);
    	const keydown_handler_6 = (dropdownIdx, e) => e.key === "Enter" && closeFilterSelect(dropdownIdx);

    	function input1_input_handler(filSelIdx, dropdownIdx) {
    		$filterOptions.filterSelection[filSelIdx].filters.Dropdown[dropdownIdx].optKeyword = this.value;
    		filterOptions.set($filterOptions);
    	}

    	const keydown_handler_7 = (option, Dropdown, optionIdx, dropdownIdx, filterSelection, e) => e.key === "Enter" && handleFilterSelectOptionChange(option.optionName, Dropdown.filName, optionIdx, dropdownIdx, Dropdown.changeType, filterSelection.filterSelectionName);

    	const change_handler = e => {
    		e.target.checked = false;
    		pleaseWaitAlert();
    	};

    	const change_handler_1 = (Checkbox, checkboxIdx, filterSelection, e) => handleCheckboxChange(e, Checkbox.filName, checkboxIdx, filterSelection.filterSelectionName);

    	function input_change_handler(each_value_4, checkboxIdx) {
    		each_value_4[checkboxIdx].isSelected = this.checked;
    	}

    	const click_handler_1 = (Checkbox, checkboxIdx, filterSelection, e) => handleCheckboxChange(e, Checkbox.filName, checkboxIdx, filterSelection.filterSelectionName);
    	const keydown_handler_8 = (Checkbox, checkboxIdx, filterSelection, e) => e.key === "Enter" && handleCheckboxChange(e, Checkbox.filName, checkboxIdx, filterSelection.filterSelectionName);
    	const input_handler = (inputNumIdx, inputNum, filterSelection, e) => handleInputNumber(e, e.target.value, inputNumIdx, inputNum.filName, inputNum.maxValue, inputNum.minValue, filterSelection.filterSelectionName);

    	const wheel_handler_2 = e => {
    		horizontalWheel(e, "filters");

    		if ($gridFullView ?? getLocalStorage('gridFullView') ?? !$android) {
    			if (!scrollingToTop && e.deltaY < 0) {
    				$$invalidate(7, scrollingToTop = true);
    				let newScrollPosition = 0;
    				document.documentElement.scrollTop = newScrollPosition;
    				$$invalidate(7, scrollingToTop = false);
    			}
    		}
    	};

    	const keydown_handler_9 = e => e.key === "Enter" && removeAllActiveTag();
    	const keydown_handler_10 = e => e.key === "Enter" && removeAllActiveTag();
    	const click_handler_2 = (optionIdx, optionName, filterType, categIdx, optionType, e) => removeActiveTag(e, optionIdx, optionName, filterType, categIdx, optionType);
    	const keydown_handler_11 = (optionIdx, optionName, filterType, categIdx, optionType, e) => e.key === "Enter" && removeActiveTag(e, optionIdx, optionName, filterType, categIdx, optionType);
    	const click_handler_3 = (optionIdx, optionName, filterType, categIdx, changeType, optionType, optionValue, e) => changeActiveSelect(e, optionIdx, optionName, filterType, categIdx, changeType, optionType, optionValue);
    	const keydown_handler_12 = (optionIdx, optionName, filterType, categIdx, changeType, optionType, optionValue, e) => e.key === "Enter" && changeActiveSelect(e, optionIdx, optionName, filterType, categIdx, changeType, optionType, optionValue);
    	const keydown_handler_13 = e => e.key === "Enter" && handleShowActiveFilters();
    	const keydown_handler_14 = e => e.key === "Enter" && handleGridView();
    	const keydown_handler_15 = e => e.key === "Enter" && changeSortType();
    	const keydown_handler_16 = e => e.key === "Enter" && handleSortFilterPopup(e);
    	const keydown_handler_17 = e => e.key === "Enter" && handleSortFilterPopup(e);
    	const keydown_handler_18 = (sortName, e) => e.key === "Enter" && changeSort(sortName);
    	const keydown_handler_19 = e => e.key === "Enter" && handleGridView();

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(35, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		saveJSON,
    		android,
    		finalAnimeList,
    		animeLoaderWorker: animeLoaderWorker$1,
    		filterOptions,
    		activeTagFilters,
    		searchedAnimeKeyword,
    		dataStatus,
    		username,
    		initData,
    		confirmPromise,
    		asyncAnimeReloaded,
    		checkAnimeLoaderStatus,
    		gridFullView,
    		hasWheel,
    		updateFilters,
    		isImporting,
    		hiddenEntries,
    		numberOfNextLoadedGrid,
    		fade,
    		fly,
    		addClass,
    		changeInputValue,
    		dragScroll,
    		removeClass,
    		getLocalStorage,
    		animeLoader,
    		processRecommendedAnimeList,
    		saveIDBdata,
    		Init,
    		windowWidth,
    		windowHeight,
    		maxFilterSelectionHeight,
    		selectedFilterTypeElement,
    		selectedFilterElement,
    		selectedSortElement,
    		highlightedEl,
    		filterScrollTimeout,
    		filterIsScrolling,
    		showAllActiveFilters,
    		showFilterOptions,
    		nameChangeUpdateProcessedList,
    		nameChangeUpdateFinalList,
    		conditionalInputNumberList,
    		isUpdatingRec,
    		isLoadingAnime,
    		saveFilters,
    		_loadAnime,
    		_processRecommendedAnimeList,
    		scrollToFirstTagFilter,
    		scrollToFirstFilter,
    		windowResized,
    		handleFilterTypes,
    		handleShowFilterTypes,
    		handleFilterScroll,
    		filterSelect,
    		closeFilterSelect,
    		clickOutsideListener,
    		handleFilterSelectOptionChange,
    		handleCheckboxChange,
    		handleInputNumber,
    		changeActiveSelect,
    		removeActiveTag,
    		removeAllActiveTag,
    		handleSortFilterPopup,
    		changeSort,
    		changeSortType,
    		handleDropdownKeyDown,
    		handleGridView,
    		handleShowFilterOptions,
    		handleShowActiveFilters,
    		asyncAnimeReloadPromise,
    		callAsyncAnimeReload,
    		hasPartialMatch,
    		closeDropdown,
    		pleaseWaitAlert,
    		horizontalWheel,
    		scrollingToTop,
    		$confirmPromise,
    		$filterOptions,
    		$animeLoaderWorker,
    		$checkAnimeLoaderStatus,
    		$finalAnimeList,
    		$gridFullView,
    		$initData,
    		$activeTagFilters,
    		$dataStatus,
    		$numberOfNextLoadedGrid,
    		$hiddenEntries,
    		$searchedAnimeKeyword,
    		$isImporting,
    		$username,
    		$hasWheel,
    		$android
    	});

    	$$self.$inject_state = $$props => {
    		if ('Init' in $$props) $$invalidate(0, Init = $$props.Init);
    		if ('windowWidth' in $$props) $$invalidate(1, windowWidth = $$props.windowWidth);
    		if ('windowHeight' in $$props) windowHeight = $$props.windowHeight;
    		if ('maxFilterSelectionHeight' in $$props) $$invalidate(2, maxFilterSelectionHeight = $$props.maxFilterSelectionHeight);
    		if ('selectedFilterTypeElement' in $$props) $$invalidate(3, selectedFilterTypeElement = $$props.selectedFilterTypeElement);
    		if ('selectedFilterElement' in $$props) selectedFilterElement = $$props.selectedFilterElement;
    		if ('selectedSortElement' in $$props) $$invalidate(4, selectedSortElement = $$props.selectedSortElement);
    		if ('highlightedEl' in $$props) highlightedEl = $$props.highlightedEl;
    		if ('filterScrollTimeout' in $$props) filterScrollTimeout = $$props.filterScrollTimeout;
    		if ('filterIsScrolling' in $$props) filterIsScrolling = $$props.filterIsScrolling;
    		if ('showAllActiveFilters' in $$props) $$invalidate(5, showAllActiveFilters = $$props.showAllActiveFilters);
    		if ('showFilterOptions' in $$props) $$invalidate(6, showFilterOptions = $$props.showFilterOptions);
    		if ('nameChangeUpdateProcessedList' in $$props) nameChangeUpdateProcessedList = $$props.nameChangeUpdateProcessedList;
    		if ('nameChangeUpdateFinalList' in $$props) nameChangeUpdateFinalList = $$props.nameChangeUpdateFinalList;
    		if ('conditionalInputNumberList' in $$props) $$invalidate(17, conditionalInputNumberList = $$props.conditionalInputNumberList);
    		if ('isUpdatingRec' in $$props) isUpdatingRec = $$props.isUpdatingRec;
    		if ('isLoadingAnime' in $$props) isLoadingAnime = $$props.isLoadingAnime;
    		if ('asyncAnimeReloadPromise' in $$props) asyncAnimeReloadPromise = $$props.asyncAnimeReloadPromise;
    		if ('scrollingToTop' in $$props) $$invalidate(7, scrollingToTop = $$props.scrollingToTop);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		Init,
    		windowWidth,
    		maxFilterSelectionHeight,
    		selectedFilterTypeElement,
    		selectedSortElement,
    		showAllActiveFilters,
    		showFilterOptions,
    		scrollingToTop,
    		$filterOptions,
    		$gridFullView,
    		$initData,
    		$activeTagFilters,
    		$dataStatus,
    		$searchedAnimeKeyword,
    		$username,
    		$hasWheel,
    		$android,
    		conditionalInputNumberList,
    		handleFilterTypes,
    		handleShowFilterTypes,
    		filterSelect,
    		closeFilterSelect,
    		handleFilterSelectOptionChange,
    		handleCheckboxChange,
    		handleInputNumber,
    		changeActiveSelect,
    		removeActiveTag,
    		removeAllActiveTag,
    		handleSortFilterPopup,
    		changeSort,
    		changeSortType,
    		handleGridView,
    		handleShowFilterOptions,
    		handleShowActiveFilters,
    		pleaseWaitAlert,
    		$$scope,
    		slots,
    		func_1,
    		input_input_handler,
    		keydown_handler,
    		keydown_handler_1,
    		keydown_handler_2,
    		keydown_handler_3,
    		input0_input_handler,
    		keydown_handler_4,
    		keydown_handler_5,
    		click_handler,
    		keydown_handler_6,
    		input1_input_handler,
    		keydown_handler_7,
    		change_handler,
    		change_handler_1,
    		input_change_handler,
    		click_handler_1,
    		keydown_handler_8,
    		input_handler,
    		wheel_handler_2,
    		keydown_handler_9,
    		keydown_handler_10,
    		click_handler_2,
    		keydown_handler_11,
    		click_handler_3,
    		keydown_handler_12,
    		keydown_handler_13,
    		keydown_handler_14,
    		keydown_handler_15,
    		keydown_handler_16,
    		keydown_handler_17,
    		keydown_handler_18,
    		keydown_handler_19
    	];
    }

    class Search extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, null, [-1, -1, -1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Search",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\Others\Confirm.svelte generated by Svelte v3.59.1 */
    const file$1 = "src\\components\\Others\\Confirm.svelte";

    // (56:0) {#if showConfirm}
    function create_if_block$1(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let div0;
    	let h20;
    	let t0;
    	let t1;
    	let h21;
    	let t2;
    	let t3;
    	let div1;
    	let t4;
    	let button;
    	let t5;
    	let div2_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = !/*isAlert*/ ctx[1] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			h20 = element("h2");
    			t0 = text(/*confirmTitle*/ ctx[2]);
    			t1 = space();
    			h21 = element("h2");
    			t2 = text(/*confirmText*/ ctx[3]);
    			t3 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t4 = space();
    			button = element("button");
    			t5 = text(/*confirmLabel*/ ctx[4]);
    			attr_dev(h20, "class", "confirm-title svelte-1mystf5");
    			add_location(h20, file$1, 70, 20, 2235);
    			attr_dev(h21, "class", "confirm-text svelte-1mystf5");
    			add_location(h21, file$1, 71, 20, 2302);
    			attr_dev(div0, "class", "confirm-info-container svelte-1mystf5");
    			add_location(div0, file$1, 69, 16, 2177);
    			attr_dev(button, "class", "button svelte-1mystf5");
    			add_location(button, file$1, 85, 20, 2886);
    			attr_dev(div1, "class", "confirm-button-container svelte-1mystf5");
    			add_location(div1, file$1, 75, 16, 2435);
    			attr_dev(div2, "class", "confirm-container svelte-1mystf5");
    			add_location(div2, file$1, 65, 12, 2038);
    			attr_dev(div3, "class", "confirm-wrapper svelte-1mystf5");
    			set_style(div3, "--height", /*$popupVisible*/ ctx[7] ? "calc(100% + 1px)" : "100%");
    			add_location(div3, file$1, 61, 8, 1898);
    			attr_dev(div4, "class", "confirm svelte-1mystf5");
    			add_location(div4, file$1, 56, 4, 1731);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h20);
    			append_dev(h20, t0);
    			append_dev(div0, t1);
    			append_dev(div0, h21);
    			append_dev(h21, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t4);
    			append_dev(div1, button);
    			append_dev(button, t5);
    			/*button_binding*/ ctx[12](button);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*handleConfirm*/ ctx[8], false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler_1*/ ctx[13], false, false, false, false),
    					listen_dev(div4, "click", /*handleConfirmVisibility*/ ctx[10], false, false, false, false),
    					listen_dev(div4, "keydown", /*keydown_handler_2*/ ctx[14], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*confirmTitle*/ 4) set_data_dev(t0, /*confirmTitle*/ ctx[2]);
    			if (!current || dirty & /*confirmText*/ 8) set_data_dev(t2, /*confirmText*/ ctx[3]);

    			if (!/*isAlert*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(div1, t4);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (!current || dirty & /*confirmLabel*/ 16) set_data_dev(t5, /*confirmLabel*/ ctx[4]);

    			if (dirty & /*$popupVisible*/ 128) {
    				set_style(div3, "--height", /*$popupVisible*/ ctx[7] ? "calc(100% + 1px)" : "100%");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fly, { y: 20, duration: 300 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fly, { y: 20, duration: 300 }, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (if_block) if_block.d();
    			/*button_binding*/ ctx[12](null);
    			if (detaching && div2_transition) div2_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(56:0) {#if showConfirm}",
    		ctx
    	});

    	return block;
    }

    // (77:20) {#if !isAlert}
    function create_if_block_1$1(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*cancelLabel*/ ctx[5]);
    			attr_dev(button, "class", "button svelte-1mystf5");
    			add_location(button, file$1, 77, 24, 2535);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*handleCancel*/ ctx[9], false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler*/ ctx[11], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*cancelLabel*/ 32) set_data_dev(t, /*cancelLabel*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(77:20) {#if !isAlert}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*showConfirm*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showConfirm*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showConfirm*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $popupVisible;
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(7, $popupVisible = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Confirm', slots, []);
    	const dispatch = createEventDispatcher();
    	let { showConfirm = false } = $$props;
    	let { isAlert = false } = $$props;
    	let { confirmTitle = "Confirmation" } = $$props;
    	let { confirmText = "Do you want to continue?" } = $$props;
    	let { confirmLabel = "OK" } = $$props;
    	let { cancelLabel = "CANCEL" } = $$props;
    	let confirmButtonEl;
    	let isRecentlyOpened = false, isRecentlyOpenedTimeout;

    	function handleConfirm(e) {
    		if (isRecentlyOpened && e.type !== "keydown") return;
    		$$invalidate(0, showConfirm = false);
    		dispatch("confirmed");
    	}

    	function handleCancel(e) {
    		if (isRecentlyOpened && e.type !== "keydown") return;
    		$$invalidate(0, showConfirm = false);
    		dispatch("cancelled");
    	}

    	function handleConfirmVisibility(e) {
    		if (isRecentlyOpened && e.type !== "keydown") return;
    		let target = e.target;
    		let classList = target.classList;
    		if (target.closest(".confirm-container") || classList.contains("confirm-container")) return;
    		handleCancel(e);
    	}

    	afterUpdate(() => {
    		if (showConfirm) {
    			isRecentlyOpened = true;

    			isRecentlyOpenedTimeout = setTimeout(
    				() => {
    					isRecentlyOpened = false;
    				},
    				500
    			);

    			confirmButtonEl?.focus?.();
    		} else {
    			if (isRecentlyOpenedTimeout) clearTimeout(isRecentlyOpenedTimeout);
    			isRecentlyOpened = false;
    		}
    	});

    	const writable_props = [
    		'showConfirm',
    		'isAlert',
    		'confirmTitle',
    		'confirmText',
    		'confirmLabel',
    		'cancelLabel'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Confirm> was created with unknown prop '${key}'`);
    	});

    	const keydown_handler = e => e.key === "Enter" && handleCancel(e);

    	function button_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			confirmButtonEl = $$value;
    			$$invalidate(6, confirmButtonEl);
    		});
    	}

    	const keydown_handler_1 = e => e.key === "Enter" && handleConfirm(e);
    	const keydown_handler_2 = e => e.key === "Enter" && handleConfirmVisibility(e);

    	$$self.$$set = $$props => {
    		if ('showConfirm' in $$props) $$invalidate(0, showConfirm = $$props.showConfirm);
    		if ('isAlert' in $$props) $$invalidate(1, isAlert = $$props.isAlert);
    		if ('confirmTitle' in $$props) $$invalidate(2, confirmTitle = $$props.confirmTitle);
    		if ('confirmText' in $$props) $$invalidate(3, confirmText = $$props.confirmText);
    		if ('confirmLabel' in $$props) $$invalidate(4, confirmLabel = $$props.confirmLabel);
    		if ('cancelLabel' in $$props) $$invalidate(5, cancelLabel = $$props.cancelLabel);
    	};

    	$$self.$capture_state = () => ({
    		fly,
    		createEventDispatcher,
    		afterUpdate,
    		popupVisible,
    		dispatch,
    		showConfirm,
    		isAlert,
    		confirmTitle,
    		confirmText,
    		confirmLabel,
    		cancelLabel,
    		confirmButtonEl,
    		isRecentlyOpened,
    		isRecentlyOpenedTimeout,
    		handleConfirm,
    		handleCancel,
    		handleConfirmVisibility,
    		$popupVisible
    	});

    	$$self.$inject_state = $$props => {
    		if ('showConfirm' in $$props) $$invalidate(0, showConfirm = $$props.showConfirm);
    		if ('isAlert' in $$props) $$invalidate(1, isAlert = $$props.isAlert);
    		if ('confirmTitle' in $$props) $$invalidate(2, confirmTitle = $$props.confirmTitle);
    		if ('confirmText' in $$props) $$invalidate(3, confirmText = $$props.confirmText);
    		if ('confirmLabel' in $$props) $$invalidate(4, confirmLabel = $$props.confirmLabel);
    		if ('cancelLabel' in $$props) $$invalidate(5, cancelLabel = $$props.cancelLabel);
    		if ('confirmButtonEl' in $$props) $$invalidate(6, confirmButtonEl = $$props.confirmButtonEl);
    		if ('isRecentlyOpened' in $$props) isRecentlyOpened = $$props.isRecentlyOpened;
    		if ('isRecentlyOpenedTimeout' in $$props) isRecentlyOpenedTimeout = $$props.isRecentlyOpenedTimeout;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		showConfirm,
    		isAlert,
    		confirmTitle,
    		confirmText,
    		confirmLabel,
    		cancelLabel,
    		confirmButtonEl,
    		$popupVisible,
    		handleConfirm,
    		handleCancel,
    		handleConfirmVisibility,
    		keydown_handler,
    		button_binding,
    		keydown_handler_1,
    		keydown_handler_2
    	];
    }

    class Confirm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			showConfirm: 0,
    			isAlert: 1,
    			confirmTitle: 2,
    			confirmText: 3,
    			confirmLabel: 4,
    			cancelLabel: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Confirm",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get showConfirm() {
    		throw new Error("<Confirm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showConfirm(value) {
    		throw new Error("<Confirm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isAlert() {
    		throw new Error("<Confirm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isAlert(value) {
    		throw new Error("<Confirm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get confirmTitle() {
    		throw new Error("<Confirm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set confirmTitle(value) {
    		throw new Error("<Confirm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get confirmText() {
    		throw new Error("<Confirm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set confirmText(value) {
    		throw new Error("<Confirm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get confirmLabel() {
    		throw new Error("<Confirm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set confirmLabel(value) {
    		throw new Error("<Confirm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cancelLabel() {
    		throw new Error("<Confirm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cancelLabel(value) {
    		throw new Error("<Confirm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // Component
    // Anime

    var C = {
        Fixed: {
            Navigator: Navigator,
            Menu: Menu,
        },
        Anime: {
            AnimeGrid: AnimeGrid,
            Fixed: {
                AnimePopup: AnimePopup,
                AnimeOptionsPopup: AnimeOptionsPopup
            }
        },
        Others: {
            Search: Search,
            Confirm: Confirm
        }
    };

    // package.json
    var name = "@vercel/analytics";
    var version = "1.0.1";

    // src/queue.ts
    var initQueue = () => {
      if (window.va)
        return;
      window.va = function a(...params) {
        (window.vaq = window.vaq || []).push(params);
      };
    };

    // src/utils.ts
    function isBrowser() {
      return typeof window !== "undefined";
    }
    function detectEnvironment() {
      try {
        const env = process.env.NODE_ENV;
        if (env === "development" || env === "test") {
          return "development";
        }
      } catch (e) {
      }
      return "production";
    }
    function setMode(mode = "auto") {
      if (mode === "auto") {
        window.vam = detectEnvironment();
        return;
      }
      window.vam = mode;
    }
    function getMode() {
      return window.vam || "production";
    }
    function isDevelopment() {
      return getMode() === "development";
    }

    // src/generic.ts
    function inject(props = {
      debug: true
    }) {
      var _a;
      if (!isBrowser())
        return;
      setMode(props.mode);
      initQueue();
      if (props.beforeSend) {
        (_a = window.va) == null ? void 0 : _a.call(window, "beforeSend", props.beforeSend);
      }
      const src = isDevelopment() ? "https://va.vercel-scripts.com/v1/script.debug.js" : "/_vercel/insights/script.js";
      if (document.head.querySelector(`script[src*="${src}"]`))
        return;
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.setAttribute("data-sdkn", name);
      script.setAttribute("data-sdkv", version);
      if (isDevelopment() && props.debug === false) {
        script.setAttribute("data-debug", "false");
      }
      document.head.appendChild(script);
    }

    /* src\App.svelte generated by Svelte v3.59.1 */

    const { console: console_1 } = globals;

    const file = "src\\App.svelte";

    // (1038:1) {#if _progress > 0 && _progress < 100}
    function create_if_block_1(ctx) {
    	let div;
    	let div_outro;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "progress svelte-1jnkk2b");
    			set_style(div, "--progress", "-" + (100 - /*_progress*/ ctx[6]) + "%");
    			add_location(div, file, 1038, 2, 28315);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "outrostart", outrostart_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*_progress*/ 64) {
    				set_style(div, "--progress", "-" + (100 - /*_progress*/ ctx[6]) + "%");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (div_outro) div_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			div_outro = create_out_transition(div, fade, { duration: 0, delay: 400 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_outro) div_outro.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(1038:1) {#if _progress > 0 && _progress < 100}",
    		ctx
    	});

    	return block;
    }

    // (1052:2) <C.Others.Search>
    function create_default_slot(ctx) {
    	let c_anime_animegrid;
    	let current;
    	c_anime_animegrid = new C.Anime.AnimeGrid({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(c_anime_animegrid.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(c_anime_animegrid, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(c_anime_animegrid.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(c_anime_animegrid.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(c_anime_animegrid, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(1052:2) <C.Others.Search>",
    		ctx
    	});

    	return block;
    }

    // (1069:1) {#if $listUpdateAvailable}
    function create_if_block(ctx) {
    	let div;
    	let i;
    	let t0;
    	let h3;
    	let div_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			t0 = space();
    			h3 = element("h3");
    			h3.textContent = "List Update";
    			attr_dev(i, "class", "list-update-icon fa-solid fa-arrows-rotate svelte-1jnkk2b");
    			add_location(i, file, 1077, 3, 29334);
    			attr_dev(h3, "class", "list-update-label svelte-1jnkk2b");
    			add_location(h3, file, 1078, 3, 29395);
    			attr_dev(div, "class", "list-update-container svelte-1jnkk2b");
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file, 1070, 2, 29138);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(div, t0);
    			append_dev(div, h3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*updateList*/ ctx[10], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler*/ ctx[11], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!current) return;
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: 50, duration: 300 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: 50, duration: 300 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(1069:1) {#if $listUpdateAvailable}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let t0;
    	let c_fixed_navigator;
    	let t1;
    	let c_fixed_menu;
    	let t2;
    	let div;
    	let c_others_search;
    	let t3;
    	let c_anime_fixed_animepopup;
    	let t4;
    	let c_anime_fixed_animeoptionspopup;
    	let t5;
    	let c_others_confirm;
    	let t6;
    	let current;
    	let if_block0 = /*_progress*/ ctx[6] > 0 && /*_progress*/ ctx[6] < 100 && create_if_block_1(ctx);
    	c_fixed_navigator = new C.Fixed.Navigator({ $$inline: true });
    	c_fixed_menu = new C.Fixed.Menu({ $$inline: true });

    	c_others_search = new C.Others.Search({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	c_anime_fixed_animepopup = new C.Anime.Fixed.AnimePopup({ $$inline: true });
    	c_anime_fixed_animeoptionspopup = new C.Anime.Fixed.AnimeOptionsPopup({ $$inline: true });

    	c_others_confirm = new C.Others.Confirm({
    			props: {
    				showConfirm: /*_showConfirm*/ ctx[0],
    				isAlert: /*_isAlert*/ ctx[1],
    				confirmTitle: /*_confirmTitle*/ ctx[2],
    				confirmText: /*_confirmText*/ ctx[3],
    				confirmLabel: /*_confirmLabel*/ ctx[4],
    				cancelLabel: /*_cancelLabel*/ ctx[5]
    			},
    			$$inline: true
    		});

    	c_others_confirm.$on("confirmed", /*handleConfirmationConfirmed*/ ctx[8]);
    	c_others_confirm.$on("cancelled", /*handleConfirmationCancelled*/ ctx[9]);
    	let if_block1 = /*$listUpdateAvailable*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			create_component(c_fixed_navigator.$$.fragment);
    			t1 = space();
    			create_component(c_fixed_menu.$$.fragment);
    			t2 = space();
    			div = element("div");
    			create_component(c_others_search.$$.fragment);
    			t3 = space();
    			create_component(c_anime_fixed_animepopup.$$.fragment);
    			t4 = space();
    			create_component(c_anime_fixed_animeoptionspopup.$$.fragment);
    			t5 = space();
    			create_component(c_others_confirm.$$.fragment);
    			t6 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "class", "home svelte-1jnkk2b");
    			add_location(div, file, 1050, 1, 28586);
    			attr_dev(main, "class", "svelte-1jnkk2b");
    			add_location(main, file, 1036, 0, 28264);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t0);
    			mount_component(c_fixed_navigator, main, null);
    			append_dev(main, t1);
    			mount_component(c_fixed_menu, main, null);
    			append_dev(main, t2);
    			append_dev(main, div);
    			mount_component(c_others_search, div, null);
    			append_dev(div, t3);
    			mount_component(c_anime_fixed_animepopup, div, null);
    			append_dev(main, t4);
    			mount_component(c_anime_fixed_animeoptionspopup, main, null);
    			append_dev(main, t5);
    			mount_component(c_others_confirm, main, null);
    			append_dev(main, t6);
    			if (if_block1) if_block1.m(main, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*_progress*/ ctx[6] > 0 && /*_progress*/ ctx[6] < 100) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*_progress*/ 64) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(main, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			const c_others_search_changes = {};

    			if (dirty[2] & /*$$scope*/ 2) {
    				c_others_search_changes.$$scope = { dirty, ctx };
    			}

    			c_others_search.$set(c_others_search_changes);
    			const c_others_confirm_changes = {};
    			if (dirty[0] & /*_showConfirm*/ 1) c_others_confirm_changes.showConfirm = /*_showConfirm*/ ctx[0];
    			if (dirty[0] & /*_isAlert*/ 2) c_others_confirm_changes.isAlert = /*_isAlert*/ ctx[1];
    			if (dirty[0] & /*_confirmTitle*/ 4) c_others_confirm_changes.confirmTitle = /*_confirmTitle*/ ctx[2];
    			if (dirty[0] & /*_confirmText*/ 8) c_others_confirm_changes.confirmText = /*_confirmText*/ ctx[3];
    			if (dirty[0] & /*_confirmLabel*/ 16) c_others_confirm_changes.confirmLabel = /*_confirmLabel*/ ctx[4];
    			if (dirty[0] & /*_cancelLabel*/ 32) c_others_confirm_changes.cancelLabel = /*_cancelLabel*/ ctx[5];
    			c_others_confirm.$set(c_others_confirm_changes);

    			if (/*$listUpdateAvailable*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$listUpdateAvailable*/ 128) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(main, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(c_fixed_navigator.$$.fragment, local);
    			transition_in(c_fixed_menu.$$.fragment, local);
    			transition_in(c_others_search.$$.fragment, local);
    			transition_in(c_anime_fixed_animepopup.$$.fragment, local);
    			transition_in(c_anime_fixed_animeoptionspopup.$$.fragment, local);
    			transition_in(c_others_confirm.$$.fragment, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(c_fixed_navigator.$$.fragment, local);
    			transition_out(c_fixed_menu.$$.fragment, local);
    			transition_out(c_others_search.$$.fragment, local);
    			transition_out(c_anime_fixed_animepopup.$$.fragment, local);
    			transition_out(c_anime_fixed_animeoptionspopup.$$.fragment, local);
    			transition_out(c_others_confirm.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			destroy_component(c_fixed_navigator);
    			destroy_component(c_fixed_menu);
    			destroy_component(c_others_search);
    			destroy_component(c_anime_fixed_animepopup);
    			destroy_component(c_anime_fixed_animeoptionspopup);
    			destroy_component(c_others_confirm);
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const outrostart_handler = e => {
    	e.target.style.setProperty("--progress", "0%");
    };

    function instance($$self, $$props, $$invalidate) {
    	let $confirmPromise;
    	let $dataStatus;
    	let $numberOfNextLoadedGrid;
    	let $hiddenEntries;
    	let $finalAnimeList;
    	let $searchedAnimeKeyword;
    	let $animeLoaderWorker;
    	let $listUpdateAvailable;
    	let $isScrolling;
    	let $android;
    	let $shouldGoBack;
    	let $gridFullView;
    	let $animeOptionVisible;
    	let $popupVisible;
    	let $menuVisible;
    	let $userRequestIsRunning;
    	let $autoUpdateInterval;
    	let $autoExportInterval;
    	let $initData;
    	let $hasWheel;
    	let $autoUpdate;
    	let $autoExport;
    	let $scrollingTimeout;
    	let $lastRunnedAutoExportDate;
    	let $lastRunnedAutoUpdateDate;
    	let $autoPlay;
    	let $filterOptions;
    	let $activeTagFilters;
    	let $username;
    	let $exportPathIsAvailable;
    	let $appID;
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(24, $confirmPromise = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(25, $dataStatus = $$value));
    	validate_store(numberOfNextLoadedGrid, 'numberOfNextLoadedGrid');
    	component_subscribe($$self, numberOfNextLoadedGrid, $$value => $$invalidate(26, $numberOfNextLoadedGrid = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(27, $hiddenEntries = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(28, $finalAnimeList = $$value));
    	validate_store(searchedAnimeKeyword, 'searchedAnimeKeyword');
    	component_subscribe($$self, searchedAnimeKeyword, $$value => $$invalidate(29, $searchedAnimeKeyword = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(30, $animeLoaderWorker = $$value));
    	validate_store(listUpdateAvailable, 'listUpdateAvailable');
    	component_subscribe($$self, listUpdateAvailable, $$value => $$invalidate(7, $listUpdateAvailable = $$value));
    	validate_store(isScrolling, 'isScrolling');
    	component_subscribe($$self, isScrolling, $$value => $$invalidate(31, $isScrolling = $$value));
    	validate_store(android, 'android');
    	component_subscribe($$self, android, $$value => $$invalidate(32, $android = $$value));
    	validate_store(shouldGoBack, 'shouldGoBack');
    	component_subscribe($$self, shouldGoBack, $$value => $$invalidate(33, $shouldGoBack = $$value));
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(34, $gridFullView = $$value));
    	validate_store(animeOptionVisible, 'animeOptionVisible');
    	component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(35, $animeOptionVisible = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(36, $popupVisible = $$value));
    	validate_store(menuVisible, 'menuVisible');
    	component_subscribe($$self, menuVisible, $$value => $$invalidate(37, $menuVisible = $$value));
    	validate_store(userRequestIsRunning, 'userRequestIsRunning');
    	component_subscribe($$self, userRequestIsRunning, $$value => $$invalidate(38, $userRequestIsRunning = $$value));
    	validate_store(autoUpdateInterval, 'autoUpdateInterval');
    	component_subscribe($$self, autoUpdateInterval, $$value => $$invalidate(39, $autoUpdateInterval = $$value));
    	validate_store(autoExportInterval, 'autoExportInterval');
    	component_subscribe($$self, autoExportInterval, $$value => $$invalidate(40, $autoExportInterval = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(41, $initData = $$value));
    	validate_store(hasWheel, 'hasWheel');
    	component_subscribe($$self, hasWheel, $$value => $$invalidate(42, $hasWheel = $$value));
    	validate_store(autoUpdate, 'autoUpdate');
    	component_subscribe($$self, autoUpdate, $$value => $$invalidate(43, $autoUpdate = $$value));
    	validate_store(autoExport, 'autoExport');
    	component_subscribe($$self, autoExport, $$value => $$invalidate(44, $autoExport = $$value));
    	validate_store(scrollingTimeout, 'scrollingTimeout');
    	component_subscribe($$self, scrollingTimeout, $$value => $$invalidate(45, $scrollingTimeout = $$value));
    	validate_store(lastRunnedAutoExportDate, 'lastRunnedAutoExportDate');
    	component_subscribe($$self, lastRunnedAutoExportDate, $$value => $$invalidate(46, $lastRunnedAutoExportDate = $$value));
    	validate_store(lastRunnedAutoUpdateDate, 'lastRunnedAutoUpdateDate');
    	component_subscribe($$self, lastRunnedAutoUpdateDate, $$value => $$invalidate(47, $lastRunnedAutoUpdateDate = $$value));
    	validate_store(autoPlay, 'autoPlay');
    	component_subscribe($$self, autoPlay, $$value => $$invalidate(48, $autoPlay = $$value));
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(49, $filterOptions = $$value));
    	validate_store(activeTagFilters, 'activeTagFilters');
    	component_subscribe($$self, activeTagFilters, $$value => $$invalidate(50, $activeTagFilters = $$value));
    	validate_store(username, 'username');
    	component_subscribe($$self, username, $$value => $$invalidate(51, $username = $$value));
    	validate_store(exportPathIsAvailable, 'exportPathIsAvailable');
    	component_subscribe($$self, exportPathIsAvailable, $$value => $$invalidate(52, $exportPathIsAvailable = $$value));
    	validate_store(appID, 'appID');
    	component_subscribe($$self, appID, $$value => $$invalidate(53, $appID = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	set_store_value(android, $android = isAndroid(), $android); // Android/Browser Identifier
    	let usernameInputEl, animeGridEl;
    	inject(); // Vercel Analytics

    	window.onload = () => {
    		window.dataLayer = window.dataLayer || [];

    		function gtag() {
    			dataLayer.push(arguments);
    		}

    		gtag("js", new Date());

    		if (window.location.origin === "https://kanshi.vercel.app") {
    			gtag("config", "G-F5E8XNQS20");
    		} else {
    			gtag("config", "G-PPMY92TJCE");
    		}
    	}; // Google Analytics

    	// For Youtube API
    	const onYouTubeIframeAPIReady = new Function();

    	window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

    	// Init Data
    	let initDataPromises = [];

    	set_store_value(dataStatus, $dataStatus = "Getting Existing Data", $dataStatus);

    	let pleaseWaitStatusInterval = setInterval(
    		() => {
    			if (!$dataStatus) {
    				set_store_value(dataStatus, $dataStatus = "Please Wait...", $dataStatus);
    			}
    		},
    		300
    	);

    	new Promise(async resolve => {
    			// Check App ID
    			set_store_value(appID, $appID = await getWebVersion(), $appID);

    			if ($android && navigator.onLine) {
    				try {
    					if ($appID) {
    						JSBridge.checkAppID($appID, false);
    					}
    				} catch(e) {
    					window.updateAppAlert?.();
    				}
    			}

    			let _gridFullView = await retrieveJSON("gridFullView") ?? !$android;

    			if (typeof _gridFullView === "boolean") {
    				setLocalStorage("gridFullView", _gridFullView);
    				set_store_value(gridFullView, $gridFullView = _gridFullView, $gridFullView);
    			}

    			resolve();
    		}).then(() => {
    		// Get Export Folder for Android
    		if (!$android) {
    			(async () => {
    				set_store_value(exportPathIsAvailable, $exportPathIsAvailable = await retrieveJSON("exportPathIsAvailable"), $exportPathIsAvailable);

    				if (typeof $exportPathIsAvailable === "boolean") {
    					setLocalStorage("exportPathIsAvailable", $exportPathIsAvailable);
    				}
    			})();
    		}

    		// Check/Get/Update/Process Anime Entries
    		initDataPromises.push(new Promise(async (resolve, reject) => {
    				let _lastAnimeUpdate = await retrieveJSON("lastAnimeUpdate");
    				let shouldGetAnimeEntries = !(_lastAnimeUpdate instanceof Date && !isNaN(_lastAnimeUpdate));

    				if (!shouldGetAnimeEntries) {
    					let animeEntriesIsEmpty = await retrieveJSON("animeEntriesIsEmpty");

    					if (animeEntriesIsEmpty) {
    						shouldGetAnimeEntries = true;
    					}
    				}

    				if (shouldGetAnimeEntries) {
    					set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);

    					getAnimeEntries().then(() => {
    						resolve();
    					}).catch(async () => {
    						reject();
    					});
    				} else {
    					resolve();
    				}
    			}));

    		// Check/Update/Process User Anime Entries
    		initDataPromises.push(new Promise(async resolve => {
    				// let accessToken = getAnilistAccessTokenFromURL();
    				// if (accessToken) {
    				// 	await saveIDBdata(accessToken, "access_token");
    				// 	$anilistAccessToken = accessToken;
    				// } else {
    				// 	$anilistAccessToken = await retrieveJSON("access_token");
    				// }
    				// if ($anilistAccessToken) {
    				// 	let getUsername = () => {
    				// 		fetch("https://graphql.anilist.co", {
    				// 			method: "POST",
    				// 			headers: {
    				// 				Authorization: "Bearer " + $anilistAccessToken,
    				// 				"Content-Type": "application/json",
    				// 				Accept: "application/json",
    				// 			},
    				// 			body: JSON.stringify({
    				// 				query: `{Viewer{name}}`,
    				// 			}),
    				// 		})
    				// 			.then(async (response) => {
    				// 				return await response.json();
    				// 			})
    				// 			.then(async (result) => {
    				// 				if (
    				// 					typeof result?.errors?.[0]?.message === "string"
    				// 				) {
    				// 					setTimeout(() => {
    				// 						return getUsername();
    				// 					}, 60000);
    				// 				} else {
    				// 					let savedUsername = await retrieveJSON(
    				// 						"username"
    				// 					);
    				// 					let _username = result.data.Viewer.name;
    				// 					if (_username && savedUsername !== _username) {
    				// 						requestUserEntries({
    				// 							username: _username,
    				// 						})
    				// 							.then(({ newusername }) => {
    				// 								if (newusername) {
    				// 									$username = newusername || "";
    				// 									importantUpdate.update(
    				// 										(e) => !e
    				// 									);
    				// 								}
    				// 							})
    				// 							.catch((error) => {
    				// 								$dataStatus =
    				// 									"Something went wrong...";
    				// 								console.error(error);
    				// 							});
    				// 					} else {
    				// 						$username =
    				// 							_username || savedUsername || "";
    				// 					}
    				// 					resolve();
    				// 				}
    				// 			})
    				// 			.catch(() => {
    				// 				setTimeout(() => {
    				// 					return getUsername();
    				// 				}, 60000);
    				// 				resolve();
    				// 			});
    				// 	};
    				// 	getUsername();
    				// } else {
    				let _username = await retrieveJSON("username");

    				if (_username) {
    					setLocalStorage("username", _username);
    					set_store_value(username, $username = _username, $username);
    				}

    				resolve();
    			})); // }

    		// Check/Get/Update Filter Options Selection
    		initDataPromises.push(new Promise(async resolve => {
    				getFilterOptions().then(data => {
    					set_store_value(activeTagFilters, $activeTagFilters = data.activeTagFilters, $activeTagFilters);
    					set_store_value(filterOptions, $filterOptions = data.filterOptions, $filterOptions);
    					resolve();
    				}).catch(() => {
    					reject();
    				});
    			}));

    		// Get Existing Data If there are any
    		initDataPromises.push(new Promise(async resolve => {
    				// Auto Play
    				let _autoPlay = await retrieveJSON("autoPlay");

    				if (typeof _autoPlay === "boolean") {
    					setLocalStorage("autoPlay", _autoPlay);
    					set_store_value(autoPlay, $autoPlay = _autoPlay, $autoPlay);
    				}

    				// Get Auto Functions
    				set_store_value(lastRunnedAutoUpdateDate, $lastRunnedAutoUpdateDate = await retrieveJSON("lastRunnedAutoUpdateDate"), $lastRunnedAutoUpdateDate);

    				set_store_value(lastRunnedAutoExportDate, $lastRunnedAutoExportDate = await retrieveJSON("lastRunnedAutoExportDate"), $lastRunnedAutoExportDate);
    				set_store_value(autoUpdate, $autoUpdate = await retrieveJSON("autoUpdate") ?? false, $autoUpdate);
    				setLocalStorage("autoUpdate", $autoUpdate);
    				set_store_value(autoExport, $autoExport = await retrieveJSON("autoExport") ?? false, $autoExport);
    				setLocalStorage("autoExport", $autoExport);
    				resolve();
    			}));

    		Promise.all(initDataPromises).then(async () => {
    			// Get/Show List
    			let shouldProcessRecommendation = await retrieveJSON("shouldProcessRecommendation");

    			if (!shouldProcessRecommendation) {
    				let recommendedAnimeListLen = await retrieveJSON("recommendedAnimeListLength");

    				if (recommendedAnimeListLen < 1) {
    					shouldProcessRecommendation = true;
    				}
    			}

    			new Promise(async resolve => {
    					if (shouldProcessRecommendation) {
    						processRecommendedAnimeList().then(async () => {
    							await saveJSON(false, "shouldProcessRecommendation");
    							resolve(false);
    						}).catch(error => {
    							throw error;
    						});
    					} else {
    						resolve(true);
    					}
    				}).then(loadSaved => {
    				animeLoader({ loadSaved }).then(async data => {
    					set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);
    					set_store_value(searchedAnimeKeyword, $searchedAnimeKeyword = "", $searchedAnimeKeyword);

    					if (data?.isNew) {
    						set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
    						set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries, $hiddenEntries);
    						set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid, $numberOfNextLoadedGrid);
    						set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    						checkAutoFunctions(true);
    						set_store_value(initData, $initData = false, $initData);
    					}

    					return;
    				}).catch(error => {
    					throw error;
    				});
    			});
    		}).catch(async error => {
    			checkAutoFunctions(true);
    			set_store_value(initData, $initData = false, $initData);
    			set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);

    			if ($android) {
    				$confirmPromise?.({
    					isAlert: true,
    					title: "Something Went Wrong",
    					text: "App may not be working properly, you may want to restart and make sure you're running the latest version."
    				});
    			} else {
    				$confirmPromise?.({
    					isAlert: true,
    					title: "Something Went Wrong",
    					text: "App may not be working properly, you may want to refresh the page, or if not clear the cookies but backup your data first."
    				});
    			}

    			console.error(error);
    		});
    	});

    	// function getAnilistAccessTokenFromURL() {
    	// 	let urlParams = new URLSearchParams(window.location.hash.slice(1));
    	// 	return urlParams.get("access_token");
    	// }
    	function checkAutoFunctions(initCheck = false) {
    		// auto Update
    		if (initCheck) {
    			set_store_value(userRequestIsRunning, $userRequestIsRunning = true, $userRequestIsRunning);

    			requestUserEntries().then(() => {
    				set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);

    				requestAnimeEntries().finally(() => {
    					checkAutoExportOnLoad();
    				});
    			}).catch(error => {
    				checkAutoExportOnLoad();
    				set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);
    				set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);
    				console.error(error);
    			});
    		} else {
    			if (autoUpdateIsPastDate() && $autoUpdate) {
    				set_store_value(userRequestIsRunning, $userRequestIsRunning = true, $userRequestIsRunning);

    				requestUserEntries().then(() => {
    					set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);

    					requestAnimeEntries().finally(() => {
    						checkAutoExportOnLoad();
    					});
    				}).catch(error => {
    					checkAutoExportOnLoad();
    					set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);
    					set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);
    					console.error(error);
    				});
    			} else {
    				checkAutoExportOnLoad();
    			}
    		}
    	}

    	function checkAutoExportOnLoad() {
    		if ($autoExport) {
    			if (autoExportIsPastDate()) {
    				exportUserData();
    			}
    		}
    	}

    	initData.subscribe(async val => {
    		if (val === false) {
    			clearInterval(pleaseWaitStatusInterval);
    		}
    	});

    	finalAnimeList.subscribe(async val => {
    		if (!$initData) return;

    		if (val?.length > 0 && $initData !== false) {
    			set_store_value(initData, $initData = false, $initData);
    		} // Have Loaded Recommendations
    	});

    	// Reactive Functions
    	importantLoad.subscribe(async val => {
    		if (typeof val !== "boolean" || $initData) return;
    		set_store_value(listUpdateAvailable, $listUpdateAvailable = false, $listUpdateAvailable);

    		if ($animeLoaderWorker) {
    			$animeLoaderWorker.terminate();
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    		}

    		animeLoader().then(async data => {
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);
    			set_store_value(searchedAnimeKeyword, $searchedAnimeKeyword = "", $searchedAnimeKeyword);

    			if (data?.isNew) {
    				set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
    				set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries, $hiddenEntries);
    				set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid, $numberOfNextLoadedGrid);
    			}

    			set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    			return;
    		}).catch(error => {
    			throw error;
    		});
    	});

    	importantUpdate.subscribe(async val => {
    		if (typeof val !== "boolean" || $initData) return;
    		await saveJSON(true, "shouldProcessRecommendation");
    		set_store_value(listUpdateAvailable, $listUpdateAvailable = false, $listUpdateAvailable);

    		processRecommendedAnimeList().then(async () => {
    			await saveJSON(false, "shouldProcessRecommendation");
    			updateFilters.update(e => !e);
    			importantLoad.update(e => !e);
    		}).catch(error => {
    			importantLoad.update(e => !e);
    			throw error;
    		});
    	});

    	updateRecommendationList.subscribe(async val => {
    		if (typeof val !== "boolean" || $initData) return;
    		await saveJSON(true, "shouldProcessRecommendation");

    		processRecommendedAnimeList().then(async () => {
    			await saveJSON(false, "shouldProcessRecommendation");
    			updateFilters.update(e => !e);
    			loadAnime.update(e => !e);
    		}).catch(error => {
    			loadAnime.update(e => !e);
    			throw error;
    		});
    	});

    	loadAnime.subscribe(async val => {
    		if (typeof val !== "boolean" || $initData) return;

    		if (($popupVisible || ($gridFullView
    		? animeGridEl.scrollLeft > 500
    		: document.documentElement.scrollTop > Math.max(0, animeGridEl?.offsetTop - 55))) && $finalAnimeList?.length) {
    			set_store_value(listUpdateAvailable, $listUpdateAvailable = true, $listUpdateAvailable);
    		} else {
    			if ($animeLoaderWorker) {
    				$animeLoaderWorker.terminate();
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    			}

    			animeLoader().then(async data => {
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);
    				set_store_value(searchedAnimeKeyword, $searchedAnimeKeyword = "", $searchedAnimeKeyword);

    				if (data?.isNew) {
    					set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
    					set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries, $hiddenEntries);
    					set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid, $numberOfNextLoadedGrid);
    				}

    				set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    				return;
    			}).catch(error => {
    				throw error;
    			});
    		}
    	});

    	updateFilters.subscribe(async val => {
    		if (typeof val !== "boolean" || $initData) return;
    		getFilterOptions();
    	});

    	let hourINMS = 60 * 60 * 1000;

    	autoUpdate.subscribe(async val => {
    		if (val === true) {
    			saveJSON(true, "autoUpdate");

    			// Check Run First
    			if (autoUpdateIsPastDate()) {
    				checkAutoFunctions();
    				if ($autoUpdateInterval) clearInterval($autoUpdateInterval);

    				set_store_value(
    					autoUpdateInterval,
    					$autoUpdateInterval = setInterval(
    						() => {
    							if ($autoUpdate) {
    								checkAutoFunctions();
    							}
    						},
    						hourINMS
    					),
    					$autoUpdateInterval
    				);
    			} else {
    				let timeLeft = hourINMS - (new Date().getTime() - $lastRunnedAutoUpdateDate?.getTime()) || 0;

    				setTimeout(
    					() => {
    						if ($autoUpdate === false) return;
    						checkAutoFunctions();
    						if ($autoUpdateInterval) clearInterval($autoUpdateInterval);

    						set_store_value(
    							autoUpdateInterval,
    							$autoUpdateInterval = setInterval(
    								() => {
    									if ($autoUpdate) {
    										checkAutoFunctions();
    									}
    								},
    								hourINMS
    							),
    							$autoUpdateInterval
    						);
    					},
    					timeLeft
    				);
    			}
    		} else if (val === false) {
    			if ($autoUpdateInterval) clearInterval($autoUpdateInterval);
    			saveJSON(false, "autoUpdate");
    		}
    	});

    	function autoUpdateIsPastDate() {
    		let isPastDate = false;

    		if (!$lastRunnedAutoUpdateDate) isPastDate = true; else if ($lastRunnedAutoUpdateDate instanceof Date && !isNaN($lastRunnedAutoUpdateDate)) {
    			if (new Date().getTime() - $lastRunnedAutoUpdateDate.getTime() > hourINMS) {
    				isPastDate = true;
    			}
    		}

    		return isPastDate;
    	}

    	runUpdate.subscribe(val => {
    		if (typeof val !== "boolean" || $initData || !navigator.onLine) return;
    		set_store_value(userRequestIsRunning, $userRequestIsRunning = true, $userRequestIsRunning);

    		requestUserEntries().then(() => {
    			set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);
    			requestAnimeEntries();
    		}).catch(error => {
    			set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);
    			set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);
    			console.error(error);
    		});
    	});

    	autoExport.subscribe(async val => {
    		if (val === true) {
    			saveJSON(true, "autoExport");

    			if (autoExportIsPastDate()) {
    				checkAutoFunctions();
    				if ($autoExportInterval) clearInterval($autoExportInterval);

    				set_store_value(
    					autoExportInterval,
    					$autoExportInterval = setInterval(
    						() => {
    							if ($autoExport) {
    								checkAutoFunctions();
    							}
    						},
    						hourINMS
    					),
    					$autoExportInterval
    				);
    			} else {
    				let timeLeft = hourINMS - (new Date().getTime() - $lastRunnedAutoExportDate?.getTime()) || 0;

    				setTimeout(
    					() => {
    						if ($autoExport === false) return;
    						checkAutoFunctions();
    						if ($autoExportInterval) clearInterval($autoExportInterval);

    						set_store_value(
    							autoExportInterval,
    							$autoExportInterval = setInterval(
    								() => {
    									if ($autoExport) {
    										checkAutoFunctions();
    									}
    								},
    								hourINMS
    							),
    							$autoExportInterval
    						);
    					},
    					timeLeft
    				);
    			}
    		} else if (val === false) {
    			if ($autoExportInterval) clearInterval($autoExportInterval);
    			saveJSON(false, "autoExport");
    		}
    	});

    	function autoExportIsPastDate() {
    		// Check Run First
    		let isPastDate = false;

    		if (!$lastRunnedAutoExportDate) isPastDate = true; else if ($lastRunnedAutoExportDate instanceof Date && !isNaN($lastRunnedAutoExportDate)) {
    			if (new Date().getTime() - $lastRunnedAutoExportDate.getTime() > hourINMS) {
    				isPastDate = true;
    			}
    		}

    		return isPastDate;
    	}

    	runExport.subscribe(val => {
    		if (typeof val !== "boolean" || $initData) return;
    		exportUserData();
    	});

    	runIsScrolling.subscribe(val => {
    		if (typeof val !== "boolean") return;
    		if (!$isScrolling) set_store_value(isScrolling, $isScrolling = true, $isScrolling);
    		if ($scrollingTimeout) clearTimeout($scrollingTimeout);

    		set_store_value(
    			scrollingTimeout,
    			$scrollingTimeout = setTimeout(
    				() => {
    					set_store_value(isScrolling, $isScrolling = false, $isScrolling);
    				},
    				500
    			),
    			$scrollingTimeout
    		);
    	});

    	// Global Function For Android/Browser
    	document.addEventListener("visibilitychange", () => {
    		if ($initData || $android || document.visibilityState !== "visible") return;

    		if ($userRequestIsRunning && (autoUpdateIsPastDate() || autoExportIsPastDate())) {
    			checkAutoFunctions();

    			if ($autoExport && !$autoExportInterval) {
    				autoExport.update(e => e);
    			}

    			if ($autoUpdate && !$autoUpdateInterval) {
    				autoUpdate.update(e => e);
    			}
    		} else if (!$userRequestIsRunning) {
    			set_store_value(userRequestIsRunning, $userRequestIsRunning = true, $userRequestIsRunning);
    			requestUserEntries({ visibilityChange: true }).then(() => set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning));
    		}
    	});

    	let _showConfirm = false;

    	if ("scrollRestoration" in window.history) {
    		window.history.scrollRestoration = "manual"; // Disable scrolling to top when navigating back
    	}

    	let windowWheel = () => {
    		set_store_value(hasWheel, $hasWheel = true, $hasWheel);
    		window.removeEventListener("wheel", windowWheel, { passive: true });
    	};

    	window.addEventListener("wheel", windowWheel, { passive: true });

    	window.checkEntries = () => {
    		if ($initData) return;

    		if ($userRequestIsRunning && (autoUpdateIsPastDate() || autoExportIsPastDate())) {
    			checkAutoFunctions();

    			if (!$autoExportInterval) {
    				autoExport.update(e => e);
    			}

    			if (!$autoUpdateInterval) {
    				autoUpdate.update(e => e);
    			}
    		} else if (!$userRequestIsRunning) {
    			set_store_value(userRequestIsRunning, $userRequestIsRunning = true, $userRequestIsRunning);
    			requestUserEntries({ visibilityChange: true }).then(() => set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning));
    		}
    	};

    	window.addEventListener("popstate", () => {
    		window.backPressed();
    	});

    	let willExit = false, exitScrollTimeout;

    	window.backPressed = () => {
    		if ($shouldGoBack && !$android) {
    			window.history.go(-1); // Only in Browser
    		} else {
    			if (!$android) {
    				window.history.pushState("visited", ""); // Push Popped State
    			}

    			if (_showConfirm) {
    				handleConfirmationCancelled();
    				$$invalidate(0, _showConfirm = false);
    				willExit = false;
    				return;
    			} else if (usernameInputEl && usernameInputEl === document?.activeElement && window.visualViewport.width <= 750) {
    				usernameInputEl?.focus?.();
    				usernameInputEl?.blur?.();
    				willExit = false;
    				return;
    			} else if ($menuVisible) {
    				set_store_value(menuVisible, $menuVisible = false, $menuVisible);
    				willExit = false;
    				return;
    			} else if (window.checkOpenFullScreenItem?.()) {
    				window.closeFullScreenItem?.();
    				willExit = false;
    				return;
    			} else if ($popupVisible) {
    				set_store_value(popupVisible, $popupVisible = false, $popupVisible);
    				willExit = false;
    				return;
    			} else if ($animeOptionVisible) {
    				set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    				willExit = false;
    				return;
    			} else if (window.checkOpenDropdown?.()) {
    				window.closeDropdown?.();
    				willExit = false;
    				return;
    			} else if (!willExit) {
    				willExit = true;

    				if ($gridFullView) {
    					animeGridEl.style.overflow = "hidden";
    					animeGridEl.style.overflow = "";

    					animeGridEl?.children?.[0]?.scrollIntoView?.({
    						container: animeGridEl,
    						behavior: "smooth",
    						block: "nearest",
    						inline: "start"
    					});
    				} else {
    					document.documentElement.style.overflow = "hidden";
    					document.documentElement.style.overflow = "";
    					window.scrollTo({ top: -9999, behavior: "smooth" });
    				}

    				return;
    			} else {
    				if ($gridFullView) {
    					animeGridEl.style.overflow = "hidden";
    					animeGridEl.scrollLeft = 0;
    					clearTimeout(exitScrollTimeout);

    					exitScrollTimeout = setTimeout(
    						() => {
    							animeGridEl.style.overflow = "";
    						},
    						100
    					);
    				} else {
    					document.documentElement.style.overflow = "hidden";
    					document.documentElement.scrollTop = 0;
    					document.body.scrollTop = 0;
    					window.scrollY = 0;
    					clearTimeout(exitScrollTimeout);

    					exitScrollTimeout = setTimeout(
    						() => {
    							document.documentElement.style.overflow = "";
    						},
    						100
    					);
    				}

    				try {
    					JSBridge.willExit();
    				} catch(e) {
    					
    				}

    				window.setShouldGoBack(true);
    				willExit = false;
    			}
    		}
    	};

    	gridFullView.subscribe(async val => {
    		await tick();

    		if (val) {
    			if (animeGridEl?.scrollLeft > 500) {
    				window.setShouldGoBack(false);
    			}
    		} else {
    			if (document.documentElement.scrollTop > Math.max(0, animeGridEl?.offsetTop - 55)) {
    				window.setShouldGoBack(false);
    			}
    		}
    	});

    	popupVisible.subscribe(val => {
    		if (val === true) window.setShouldGoBack(false);
    	});

    	menuVisible.subscribe(val => {
    		if (val === true) window.setShouldGoBack(false);
    	});

    	window.addEventListener("scroll", () => {
    		if (document.documentElement.scrollTop > Math.max(0, animeGridEl?.offsetTop - 55) && !willExit) window.setShouldGoBack(false);
    		runIsScrolling.update(e => !e);
    	});

    	onMount(() => {
    		usernameInputEl = document.getElementById("usernameInput");
    		animeGridEl = document.getElementById("anime-grid");

    		animeGridEl?.addEventListener("scroll", () => {
    			if (animeGridEl.scrollLeft > Math.max(0, animeGridEl?.offsetTop - 55) && !willExit) window.setShouldGoBack(false);
    			if (!$gridFullView) return;
    			runIsScrolling.update(e => !e);
    		});

    		document.getElementById("popup-container").addEventListener("scroll", () => {
    			runIsScrolling.update(e => !e);
    		});
    	});

    	window.setShouldGoBack = _shouldGoBack => {
    		if (!_shouldGoBack) willExit = false;

    		if ($android) {
    			try {
    				JSBridge.setShouldGoBack(_shouldGoBack);
    			} catch(e) {
    				
    			}
    		} else {
    			if (window.history.state !== "visited") {
    				// Only Add 1 state
    				window.history.pushState("visited", "");
    			}

    			set_store_value(shouldGoBack, $shouldGoBack = _shouldGoBack, $shouldGoBack);
    		}
    	};

    	window.copyToClipBoard = text => {
    		if ($android) {
    			try {
    				JSBridge.copyToClipBoard(text);
    			} catch(e) {
    				
    			}
    		} else {
    			navigator?.clipboard?.writeText?.(text);
    		}
    	};

    	let isChangingPopupVisible, isChangingPopupVisibleTimeout;

    	popupIsGoingBack.subscribe(() => {
    		clearTimeout(isChangingPopupVisibleTimeout);
    		isChangingPopupVisible = true;

    		isChangingPopupVisibleTimeout = setTimeout(
    			() => {
    				isChangingPopupVisible = false;
    			},
    			500
    		);
    	});

    	let copytimeoutId;
    	let copyhold = false;

    	document.addEventListener("pointerdown", e => {
    		if (e.pointerType === "mouse") return;
    		let target = e.target;
    		let classList = target.classList;
    		if (!classList.contains("copy")) target = target.closest(".copy");

    		if (target) {
    			copyhold = true;
    			if (copytimeoutId) clearTimeout(copytimeoutId);

    			copytimeoutId = setTimeout(
    				() => {
    					let text = target.getAttribute("copy-value");

    					if (text && !$isScrolling && copyhold && !isChangingPopupVisible) {
    						target.style.pointerEvents = "none";

    						setTimeout(
    							() => {
    								target.style.pointerEvents = "";
    							},
    							500
    						);

    						window.copyToClipBoard(text);
    					}
    				},
    				500
    			);
    		}
    	});

    	document.addEventListener("pointerup", e => {
    		if (e.pointerType === "mouse") return;
    		let target = e.target;
    		let classList = target.classList;
    		if (!classList.contains("copy")) target = target.closest(".copy");

    		if (target) {
    			copyhold = false;
    			if (copytimeoutId) clearTimeout(copytimeoutId);
    		}
    	});

    	document.addEventListener("pointercancel", e => {
    		if (e.pointerType === "mouse") return;
    		let target = e.target;
    		let classList = target.classList;
    		if (!classList.contains("copy")) target = target.closest(".copy");

    		if (target) {
    			copyhold = false;
    			if (copytimeoutId) clearTimeout(copytimeoutId);
    		}
    	});

    	let _isAlert, _confirmTitle, _confirmText, _confirmLabel, _cancelLabel;
    	let _confirmModalPromise;

    	set_store_value(
    		confirmPromise,
    		$confirmPromise = window.confirmPromise = async confirmValues => {
    			return new Promise(resolve => {
    					$$invalidate(1, _isAlert = confirmValues?.isAlert || false);
    					$$invalidate(2, _confirmTitle = confirmValues?.title || (_isAlert ? "Heads Up" : "Confirmation"));

    					$$invalidate(3, _confirmText = (typeof confirmValues === "string"
    					? confirmValues
    					: confirmValues?.text) || "Are you sure you want to continue");

    					$$invalidate(4, _confirmLabel = confirmValues?.confirmLabel || "OK");
    					$$invalidate(5, _cancelLabel = confirmValues?.cancelLabel || "CANCEL");
    					$$invalidate(0, _showConfirm = true);
    					_confirmModalPromise = { resolve };
    				});
    		},
    		$confirmPromise
    	);

    	function handleConfirmationConfirmed() {
    		_confirmModalPromise?.resolve?.(true);
    		_confirmModalPromise = $$invalidate(1, _isAlert = $$invalidate(2, _confirmTitle = $$invalidate(3, _confirmText = $$invalidate(4, _confirmLabel = $$invalidate(5, _cancelLabel = undefined)))));
    		$$invalidate(0, _showConfirm = false);
    	}

    	function handleConfirmationCancelled() {
    		_confirmModalPromise?.resolve?.(false);
    		_confirmModalPromise = $$invalidate(1, _isAlert = $$invalidate(2, _confirmTitle = $$invalidate(3, _confirmText = $$invalidate(4, _confirmLabel = $$invalidate(5, _cancelLabel = undefined)))));
    		$$invalidate(0, _showConfirm = false);
    	}

    	let updateListIconSpinningTimeout;

    	async function updateList(event) {
    		if (await $confirmPromise({
    			title: "List update is available",
    			text: "Are you sure you want to refresh the list?"
    		})) {
    			let element = event.target;
    			let classList = element.classList;
    			let updateIcon;

    			if (classList.contains("list-update-container")) {
    				updateIcon = element.querySelector?.(".list-update-icon");
    			} else {
    				updateIcon = element?.closest(".list-update-container")?.querySelector?.(".list-update-icon");
    			}

    			if (updateListIconSpinningTimeout) clearTimeout(updateListIconSpinningTimeout);
    			addClass(updateIcon, "fa-spin");

    			if ($animeLoaderWorker) {
    				$animeLoaderWorker.terminate();
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    			}

    			animeLoader().then(async data => {
    				set_store_value(listUpdateAvailable, $listUpdateAvailable = false, $listUpdateAvailable);

    				updateListIconSpinningTimeout = setTimeout(
    					() => {
    						removeClass(updateIcon, "fa-spin");
    					},
    					300
    				);

    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);
    				set_store_value(searchedAnimeKeyword, $searchedAnimeKeyword = "", $searchedAnimeKeyword);

    				if (data?.isNew) {
    					set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
    					set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries, $hiddenEntries);
    					set_store_value(numberOfNextLoadedGrid, $numberOfNextLoadedGrid = data.numberOfNextLoadedGrid, $numberOfNextLoadedGrid);
    				}

    				set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    				return;
    			}).catch(error => {
    				throw error;
    			});
    		}
    	}

    	window.updateAppAlert = async () => {
    		if (await $confirmPromise?.({
    			title: "New updates are available",
    			text: "You may want to download the new version.",
    			confirmLabel: "DOWNLOAD"
    		})) {
    			try {
    				JSBridge.downloadUpdate();
    			} catch(e) {
    				window.open("https://github.com/u-Kuro/Kanshi.Anime-Recommendation/raw/main/Kanshi.apk", "_blank");
    			}
    		}
    	};

    	let _progress = 0, progressFrame, progressChangeStart = performance.now();

    	progress.subscribe(val => {
    		if (val >= 100 || val <= 0 || performance.now() - progressChangeStart > 300) {
    			cancelAnimationFrame(progressFrame);

    			progressFrame = requestAnimationFrame(() => {
    				$$invalidate(6, _progress = val);
    			});

    			progressChangeStart = performance.now();
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const keydown_handler = e => e.key === "Enter" && updateList(e);

    	$$self.$capture_state = () => ({
    		getWebVersion,
    		C,
    		onMount,
    		tick,
    		fade,
    		fly,
    		inject,
    		retrieveJSON,
    		saveJSON,
    		appID,
    		android,
    		username,
    		hiddenEntries,
    		filterOptions,
    		activeTagFilters,
    		finalAnimeList,
    		animeLoaderWorker: animeLoaderWorker$1,
    		initData,
    		gridFullView,
    		searchedAnimeKeyword,
    		dataStatus,
    		userRequestIsRunning,
    		autoUpdate,
    		autoUpdateInterval,
    		lastRunnedAutoUpdateDate,
    		exportPathIsAvailable,
    		autoExport,
    		autoExportInterval,
    		lastRunnedAutoExportDate,
    		autoPlay,
    		popupVisible,
    		menuVisible,
    		shouldGoBack,
    		isScrolling,
    		scrollingTimeout,
    		listUpdateAvailable,
    		runUpdate,
    		runExport,
    		importantLoad,
    		importantUpdate,
    		updateRecommendationList,
    		loadAnime,
    		updateFilters,
    		animeOptionVisible,
    		runIsScrolling,
    		confirmPromise,
    		hasWheel,
    		numberOfNextLoadedGrid,
    		progress,
    		popupIsGoingBack,
    		getAnimeEntries,
    		getFilterOptions,
    		requestAnimeEntries,
    		requestUserEntries,
    		processRecommendedAnimeList,
    		animeLoader,
    		exportUserData,
    		isAndroid,
    		addClass,
    		removeClass,
    		setLocalStorage,
    		usernameInputEl,
    		animeGridEl,
    		onYouTubeIframeAPIReady,
    		initDataPromises,
    		pleaseWaitStatusInterval,
    		checkAutoFunctions,
    		checkAutoExportOnLoad,
    		hourINMS,
    		autoUpdateIsPastDate,
    		autoExportIsPastDate,
    		_showConfirm,
    		windowWheel,
    		willExit,
    		exitScrollTimeout,
    		isChangingPopupVisible,
    		isChangingPopupVisibleTimeout,
    		copytimeoutId,
    		copyhold,
    		_isAlert,
    		_confirmTitle,
    		_confirmText,
    		_confirmLabel,
    		_cancelLabel,
    		_confirmModalPromise,
    		handleConfirmationConfirmed,
    		handleConfirmationCancelled,
    		updateListIconSpinningTimeout,
    		updateList,
    		_progress,
    		progressFrame,
    		progressChangeStart,
    		$confirmPromise,
    		$dataStatus,
    		$numberOfNextLoadedGrid,
    		$hiddenEntries,
    		$finalAnimeList,
    		$searchedAnimeKeyword,
    		$animeLoaderWorker,
    		$listUpdateAvailable,
    		$isScrolling,
    		$android,
    		$shouldGoBack,
    		$gridFullView,
    		$animeOptionVisible,
    		$popupVisible,
    		$menuVisible,
    		$userRequestIsRunning,
    		$autoUpdateInterval,
    		$autoExportInterval,
    		$initData,
    		$hasWheel,
    		$autoUpdate,
    		$autoExport,
    		$scrollingTimeout,
    		$lastRunnedAutoExportDate,
    		$lastRunnedAutoUpdateDate,
    		$autoPlay,
    		$filterOptions,
    		$activeTagFilters,
    		$username,
    		$exportPathIsAvailable,
    		$appID
    	});

    	$$self.$inject_state = $$props => {
    		if ('usernameInputEl' in $$props) usernameInputEl = $$props.usernameInputEl;
    		if ('animeGridEl' in $$props) animeGridEl = $$props.animeGridEl;
    		if ('initDataPromises' in $$props) initDataPromises = $$props.initDataPromises;
    		if ('pleaseWaitStatusInterval' in $$props) pleaseWaitStatusInterval = $$props.pleaseWaitStatusInterval;
    		if ('hourINMS' in $$props) hourINMS = $$props.hourINMS;
    		if ('_showConfirm' in $$props) $$invalidate(0, _showConfirm = $$props._showConfirm);
    		if ('windowWheel' in $$props) windowWheel = $$props.windowWheel;
    		if ('willExit' in $$props) willExit = $$props.willExit;
    		if ('exitScrollTimeout' in $$props) exitScrollTimeout = $$props.exitScrollTimeout;
    		if ('isChangingPopupVisible' in $$props) isChangingPopupVisible = $$props.isChangingPopupVisible;
    		if ('isChangingPopupVisibleTimeout' in $$props) isChangingPopupVisibleTimeout = $$props.isChangingPopupVisibleTimeout;
    		if ('copytimeoutId' in $$props) copytimeoutId = $$props.copytimeoutId;
    		if ('copyhold' in $$props) copyhold = $$props.copyhold;
    		if ('_isAlert' in $$props) $$invalidate(1, _isAlert = $$props._isAlert);
    		if ('_confirmTitle' in $$props) $$invalidate(2, _confirmTitle = $$props._confirmTitle);
    		if ('_confirmText' in $$props) $$invalidate(3, _confirmText = $$props._confirmText);
    		if ('_confirmLabel' in $$props) $$invalidate(4, _confirmLabel = $$props._confirmLabel);
    		if ('_cancelLabel' in $$props) $$invalidate(5, _cancelLabel = $$props._cancelLabel);
    		if ('_confirmModalPromise' in $$props) _confirmModalPromise = $$props._confirmModalPromise;
    		if ('updateListIconSpinningTimeout' in $$props) updateListIconSpinningTimeout = $$props.updateListIconSpinningTimeout;
    		if ('_progress' in $$props) $$invalidate(6, _progress = $$props._progress);
    		if ('progressFrame' in $$props) progressFrame = $$props.progressFrame;
    		if ('progressChangeStart' in $$props) progressChangeStart = $$props.progressChangeStart;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		_showConfirm,
    		_isAlert,
    		_confirmTitle,
    		_confirmText,
    		_confirmLabel,
    		_cancelLabel,
    		_progress,
    		$listUpdateAvailable,
    		handleConfirmationConfirmed,
    		handleConfirmationCancelled,
    		updateList,
    		keydown_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    window.FontAwesomeKitConfig={asyncLoading:{enabled:!1},autoA11y:{enabled:!0},baseUrl:"https://ka-f.fontawesome.com",baseUrlKit:"https://kit.fontawesome.com",detectConflictsUntil:null,iconUploads:{},id:76794169,license:"free",method:"css",minify:{enabled:!0},token:"5a5fa257cb",v4FontFaceShim:{enabled:!0},v4shim:{enabled:!0},v5FontFaceShim:{enabled:!0},version:"6.2.0"},function(t){t();}(function(){function r(t){return (r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function e(e,t){var n,o=Object.keys(e);return Object.getOwnPropertySymbols&&(n=Object.getOwnPropertySymbols(e),t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),o.push.apply(o,n)),o}function u(o){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?e(Object(r),!0).forEach(function(t){var e,n;e=o,n=r[t=t],t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n;}):Object.getOwnPropertyDescriptors?Object.defineProperties(o,Object.getOwnPropertyDescriptors(r)):e(Object(r)).forEach(function(t){Object.defineProperty(o,t,Object.getOwnPropertyDescriptor(r,t));});}return o}function i(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,o=new Array(e);n<e;n++)o[n]=t[n];return o}function o(t,e){var n=e&&e.addOn||"",n=e&&e.baseFilename||t.license+n,o=e&&e.minify?".min":"",r=e&&e.fileSuffix||t.method,e=e&&e.subdir||t.method;return t.baseUrl+"/releases/"+("latest"===t.version?"latest":"v".concat(t.version))+"/"+e+"/"+n+o+"."+r}function s(o,t){t="."+Array.prototype.join.call(t||["fa"],",."),t=o.querySelectorAll(t);Array.prototype.forEach.call(t,function(t){var e=t.getAttribute("title"),n=(t.setAttribute("aria-hidden","true"),!t.nextElementSibling||!t.nextElementSibling.classList.contains("sr-only"));e&&n&&((n=o.createElement("span")).innerHTML=e,n.classList.add("sr-only"),t.parentNode.insertBefore(n,t.nextSibling));});}function c(){}var n,a="undefined"!=typeof commonjsGlobal&&void 0!==commonjsGlobal.process&&"function"==typeof commonjsGlobal.process.emit,f="undefined"==typeof setImmediate?setTimeout:setImmediate,d=[];function l(){for(var t=0;t<d.length;t++)d[t][0](d[t][1]);n=!(d=[]);}function h(t,e){d.push([t,e]),n||(n=!0,f(l,0));}function m(t){var e=t.owner,n=e._state,e=e._data,o=t[n],r=t.then;if("function"==typeof o){n="fulfilled";try{e=o(e);}catch(t){v(r,t);}}p(r,e)||("fulfilled"===n&&b(r,e),"rejected"===n&&v(r,e));}function p(e,n){var o;try{if(e===n)throw new TypeError("A promises callback cannot return that same promise.");if(n&&("function"==typeof n||"object"===r(n))){var t=n.then;if("function"==typeof t)return t.call(n,function(t){o||(o=!0,(n===t?y:b)(e,t));},function(t){o||(o=!0,v(e,t));}),1}}catch(t){return o||v(e,t),1}}function b(t,e){t!==e&&p(t,e)||y(t,e);}function y(t,e){"pending"===t._state&&(t._state="settled",t._data=e,h(w,t));}function v(t,e){"pending"===t._state&&(t._state="settled",t._data=e,h(A,t));}function g(t){t._then=t._then.forEach(m);}function w(t){t._state="fulfilled",g(t);}function A(t){t._state="rejected",g(t),!t._handled&&a&&commonjsGlobal.process.emit("unhandledRejection",t._data,t);}function S(t){commonjsGlobal.process.emit("rejectionHandled",t);}function O(t){if("function"!=typeof t)throw new TypeError("Promise resolver "+t+" is not a function");if(this instanceof O==0)throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");this._then=[];var e=t,n=this;function o(t){v(n,t);}try{e(function(t){b(n,t);},o);}catch(e){o(e);}}O.prototype={constructor:O,_state:"pending",_then:null,_data:void 0,_handled:!1,then:function(t,e){var n={owner:this,then:new this.constructor(c),fulfilled:t,rejected:e};return !e&&!t||this._handled||(this._handled=!0,"rejected"===this._state&&a&&h(S,this)),"fulfilled"===this._state||"rejected"===this._state?h(m,n):this._then.push(n),n.then},catch:function(t){return this.then(null,t)}},O.all=function(c){if(Array.isArray(c))return new O(function(n,t){var o=[],r=0;for(var e,i=0;i<c.length;i++)(e=c[i])&&"function"==typeof e.then?e.then(function(e){return r++,function(t){o[e]=t,--r||n(o);}}(i),t):o[i]=e;r||n(o);});throw new TypeError("You must pass an array to Promise.all().")},O.race=function(r){if(Array.isArray(r))return new O(function(t,e){for(var n,o=0;o<r.length;o++)(n=r[o])&&"function"==typeof n.then?n.then(t,e):t(n);});throw new TypeError("You must pass an array to Promise.race().")},O.resolve=function(e){return e&&"object"===r(e)&&e.constructor===O?e:new O(function(t){t(e);})},O.reject=function(n){return new O(function(t,e){e(n);})};var j,F,E,_,C="function"==typeof Promise?Promise:O;function P(t,e){var r=e.fetch,i=e.XMLHttpRequest,e=e.token,c=t;return "URLSearchParams"in window?(c=new URL(t)).searchParams.set("token",e):c=c+"?token="+encodeURIComponent(e),c=c.toString(),new C(function(e,n){var o;"function"==typeof r?r(c,{mode:"cors",cache:"default"}).then(function(t){if(t.ok)return t.text();throw new Error("")}).then(function(t){e(t);}).catch(n):"function"==typeof i?((o=new i).addEventListener("loadend",function(){this.responseText?e(this.responseText):n(new Error(""));}),["abort","error","timeout"].map(function(t){o.addEventListener(t,function(){n(new Error(""));});}),o.open("GET",c),o.send()):n(new Error(""));})}function U(t,n,o){var r=t;return [[/(url\("?)\.\.\/\.\.\/\.\./g,function(t,e){return "".concat(e).concat(n)}],[/(url\("?)\.\.\/webfonts/g,function(t,e){return "".concat(e).concat(n,"/releases/v").concat(o,"/webfonts")}],[/(url\("?)https:\/\/kit-free([^.])*\.fontawesome\.com/g,function(t,e){return "".concat(e).concat(n)}]].forEach(function(t){e=2;var t=function(t){if(Array.isArray(t))return t}(t=t)||function(t,e){if("undefined"!=typeof Symbol&&Symbol.iterator in Object(t)){var n=[],o=!0,r=!1,i=void 0;try{for(var c,a=t[Symbol.iterator]();!(o=(c=a.next()).done)&&(n.push(c.value),!e||n.length!==e);o=!0);}catch(t){r=!0,i=t;}finally{try{o||null==a.return||a.return();}finally{if(r)throw i}}return n}}(t,e)||function(t,e){var n;if(t)return "string"==typeof t?i(t,e):"Map"===(n="Object"===(n=Object.prototype.toString.call(t).slice(8,-1))&&t.constructor?t.constructor.name:n)||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?i(t,e):void 0}(t,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}(),e=t[0],t=t[1];r=r.replace(e,t);}),r}function k(c,a,t){var t=2<arguments.length&&void 0!==t?t:function(){},e=a.document||e,e=s.bind(s,e,["fa","fab","fas","far","fal","fad","fak"]),n=0<Object.keys(c.iconUploads||{}).length,t=(c.autoA11y.enabled&&t(e),[{id:"fa-main",addOn:void 0}]),e=(c.v4shim&&c.v4shim.enabled&&t.push({id:"fa-v4-shims",addOn:"-v4-shims"}),c.v5FontFaceShim&&c.v5FontFaceShim.enabled&&t.push({id:"fa-v5-font-face",addOn:"-v5-font-face"}),c.v4FontFaceShim&&c.v4FontFaceShim.enabled&&t.push({id:"fa-v4-font-face",addOn:"-v4-font-face"}),n&&t.push({id:"fa-kit-upload",customCss:!0}),t.map(function(i){return new C(function(r,t){P(i.customCss?c.baseUrlKit+"/"+c.token+"/"+c.id+"/kit-upload.css":o(c,{addOn:i.addOn,minify:c.minify.enabled}),a).then(function(t){var e,n,o;r((t=t,e=u(u({},a),{},{baseUrl:c.baseUrl,version:c.version,id:i.id,contentFilter:function(t,e){return U(t,e.baseUrl,e.version)}}),n=e.contentFilter||function(t,e){return t},o=document.createElement("style"),n=document.createTextNode(n(t,e)),o.appendChild(n),o.media="all",e.id&&o.setAttribute("id",e.id),e&&e.detectingConflicts&&e.detectionIgnoreAttr&&o.setAttributeNode(document.createAttribute(e.detectionIgnoreAttr)),o));}).catch(t);})}));return C.all(e)}function L(n,i){i.autoA11y=n.autoA11y.enabled,"pro"===n.license&&(i.autoFetchSvg=!0,i.fetchSvgFrom=n.baseUrl+"/releases/"+("latest"===n.version?"latest":"v".concat(n.version))+"/svgs",i.fetchUploadedSvgFrom=n.uploadsUrl);var t=[];return n.v4shim.enabled&&t.push(new C(function(e,t){P(o(n,{addOn:"-v4-shims",minify:n.minify.enabled}),i).then(function(t){e(I(t,u(u({},i),{},{id:"fa-v4-shims"})));}).catch(t);})),t.push(new C(function(r,t){P(o(n,{minify:n.minify.enabled}),i).then(function(t){var e,n,o,t=I(t,u(u({},i),{},{id:"fa-main"}));r((t=t,n=(e=i)&&void 0!==e.autoFetchSvg?e.autoFetchSvg:void 0,void 0!==(o=e&&void 0!==e.autoA11y?e.autoA11y:void 0)&&t.setAttribute("data-auto-a11y",o?"true":"false"),n&&(t.setAttributeNode(document.createAttribute("data-auto-fetch-svg")),t.setAttribute("data-fetch-svg-from",e.fetchSvgFrom),t.setAttribute("data-fetch-uploaded-svg-from",e.fetchUploadedSvgFrom)),t));}).catch(t);})),C.all(t)}function I(t,e){var n=document.createElement("SCRIPT"),t=document.createTextNode(t);return n.appendChild(t),n.referrerPolicy="strict-origin",e.id&&n.setAttribute("id",e.id),e&&e.detectingConflicts&&e.detectionIgnoreAttr&&n.setAttributeNode(document.createAttribute(e.detectionIgnoreAttr)),n}function T(t){var e,n=[],o=document,r=(o.documentElement.doScroll?/^loaded|^c/:/^loaded|^i|^c/).test(o.readyState);r||o.addEventListener("DOMContentLoaded",e=function(){for(o.removeEventListener("DOMContentLoaded",e),r=1;e=n.shift();)e();}),r?setTimeout(t,0):n.push(t);}try{window.FontAwesomeKitConfig&&(j=window.FontAwesomeKitConfig,F={detectingConflicts:j.detectConflictsUntil&&new Date<=new Date(j.detectConflictsUntil),detectionIgnoreAttr:"data-fa-detection-ignore",fetch:window.fetch,token:j.token,XMLHttpRequest:window.XMLHttpRequest,document:document},E=document.currentScript,_=E?E.parentElement:document.head,function(t,e){t=0<arguments.length&&void 0!==t?t:{},e=1<arguments.length&&void 0!==e?e:{};return "js"===t.method?L(t,e):"css"===t.method?k(t,e,function(t){T(t),t=t,"undefined"!=typeof MutationObserver&&new MutationObserver(t).observe(document,{childList:!0,subtree:!0});}):void 0}(j,F).then(function(t){t.map(function(e){try{_.insertBefore(e,E?E.nextSibling:null);}catch(t){_.appendChild(e);}}),F.detectingConflicts&&E&&T(function(){E.setAttributeNode(document.createAttribute(F.detectionIgnoreAttr));t=j,n=F,e=document.createElement("script"),n.detectionIgnoreAttr&&e.setAttributeNode(document.createAttribute(n.detectionIgnoreAttr)),e.src=o(t,{baseFilename:"conflict-detection",fileSuffix:"js",subdir:"js",minify:t.minify.enabled});var t,e,n=e;document.body.appendChild(n);});}).catch(function(t){console.error("".concat("Font Awesome Kit:"," ").concat(t));}));}catch(r){console.error("".concat("Font Awesome Kit:"," ").concat(r));}});

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
