
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
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
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
                console.error(keys);
                throw new Error(`Cannot have duplicate keys in a keyed each ${JSON.stringify(key)} is a duplicate`);
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

    const version$1 = 241;
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
    function getLastVisibleElement(childSelector, parent) {
      try {
        let childElements;
        if (parent instanceof Element) {
          childElements = parent?.querySelectorAll?.(childSelector);
        } else {
          childElements = document?.querySelectorAll?.(childSelector);
        }
        if (childElements instanceof NodeList) {
          let windowViewHeight = window?.visualViewport?.height || window.innerHeight;
          childElements = Array.from(childElements);
          for (let i = 0; i < childElements.length; i++) {
            let rect = childElements[i]?.getBoundingClientRect?.();
            if (rect && rect.top > windowViewHeight) {
              return childElements[Math.max(0, i - 1)]
            }
          }
        }
      } catch (ex) { }
    }
    function getMostVisibleElement(parent, childSelector, intersectionRatioThreshold = 0.5) {
      try {
        let childElements;
        if (childSelector instanceof Array) {
          childElements = childSelector;
        } else {
          childElements = parent.querySelectorAll(childSelector);
        }
        let mostVisibleElement = null;
        let highestVisibleRatio = 0;
        let twoElements = [];
        let parentScroll = parent.scrollTop;
        for (let i = 0; i < childElements.length; i++) {
          if (childElements[i].offsetTop > parentScroll) {
            if (i > 0) {
              twoElements = [childElements[i - 1], childElements[i]];
            } else if (i === 0) {
              twoElements = [childElements[i]];
            } else {
              twoElements = [];
            }
            break;
          }
        }
        let parentRect = parent.getBoundingClientRect();
        twoElements.forEach((childElement) => {
          let childRect = childElement.getBoundingClientRect();
          let intersectionHeight = Math.min(childRect.bottom, parentRect.bottom) - Math.max(childRect.top, parentRect.top);
          let intersectionRatio = intersectionHeight / childRect.height;
          if (intersectionRatio >= intersectionRatioThreshold && intersectionRatio > highestVisibleRatio) {
            highestVisibleRatio = intersectionRatio;
            mostVisibleElement = childElement;
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
        let boundingRect = element.getBoundingClientRect();
        let parentRect = parent.getBoundingClientRect();
        let overflowX = getComputedStyle(parent).overflowX;
        let overflowY = getComputedStyle(parent).overflowY;
        let isParentScrollable = overflowX === 'auto' || overflowX === 'scroll' || overflowY === 'auto' || overflowY === 'scroll';
        if (isParentScrollable) {
          let scrollLeft = parent.scrollLeft;
          let scrollTop = parent.scrollTop;
          let isVisible = (
            boundingRect.top >= parentRect.top &&
            boundingRect.left >= parentRect.left &&
            boundingRect.bottom <= parentRect.bottom &&
            boundingRect.right <= parentRect.right
          );
          if (!isVisible) {
            let intersectionTop = Math.max(boundingRect.top, parentRect.top) - Math.min(boundingRect.bottom, parentRect.bottom);
            let intersectionLeft = Math.max(boundingRect.left, parentRect.left) - Math.min(boundingRect.right, parentRect.right);
            let intersectionArea = intersectionTop * intersectionLeft;
            let elementArea = Math.min(boundingRect.height, window.innerHeight) * Math.min(boundingRect.width, window.innerWidth);
            let intersectionRatio = intersectionArea / elementArea;
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
        let windowHeight = window.innerHeight || document.documentElement.clientHeight;
        let windowWidth = window.innerWidth || document.documentElement.clientWidth;
        let isVisibleInWindow = (
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

    let trimAllEmptyCharRegex = new RegExp("ㅤ", "g");
    const trimAllEmptyChar = (str) => {
      return str?.replace?.(trimAllEmptyCharRegex, "")?.trim?.() || "";
    };

    const ncsCompare = (str1, str2) => {
      try {
        if (typeof str1 !== "string" || typeof str2 !== "string") {
          return false;
        }
        return str1.trim().toLowerCase() === str2.trim().toLowerCase();
      } catch (e) { }
    };

    const changeInputValue = (inputElement, newValue) => {
      let selectionStart = Math.max(inputElement.selectionStart - 1 || 0, 0);
      inputElement.value = newValue;
      inputElement.setSelectionRange(selectionStart, selectionStart);
    };

    const dragScroll = (element, axis = 'xy', avoidCondition = () => false) => {
      let curDown, curYPos, curXPos, velocityY, velocityX, currentScrollYPosition, currentScrollXPosition;

      let move = (e) => {
        if (curDown && e.pointerType === "mouse") {
          if (axis.toLowerCase().includes('y')) {
            let endYPos = e.clientY;
            let deltaY = endYPos - curYPos;
            element.scrollTop = currentScrollYPosition - deltaY;
          }
          if (axis.toLowerCase().includes('x')) {
            let endXPos = e.clientX;
            let deltaX = endXPos - curXPos;
            element.scrollLeft = currentScrollXPosition - deltaX;
          }
        }
      };

      let down = (e) => {
        if (e.pointerType !== "mouse" || avoidCondition(e)) return
        velocityY = 0;
        cancelAnimationFrame(kineticScrollYAnimation);
        velocityX = 0;
        cancelAnimationFrame(kineticScrollXAnimation);
        if (axis.toLowerCase().includes('y')) {
          curYPos = e.clientY;
          currentScrollYPosition = element.scrollTop;
        }
        if (axis.toLowerCase().includes('x')) {
          curXPos = e.clientX;
          currentScrollXPosition = element.scrollLeft;
        }
        curDown = true;
      };

      let up = (e) => {
        if (curDown) {
          if (axis.toLowerCase().includes('y') && e.pointerType === "mouse") {
            let endYPos = e.clientY;
            let deltaY = endYPos - curYPos;
            element.scrollTop = currentScrollYPosition - deltaY;
            velocityY = deltaY;
            simulateKineticScrollY(element);
          }
          if (axis.toLowerCase().includes('x') && e.pointerType === "mouse") {
            let endXPos = e.clientX;
            let deltaX = endXPos - curXPos;
            element.scrollLeft = currentScrollXPosition - deltaX;
            velocityX = deltaX;
            simulateKineticScrollX(element);
          }
        }
        curDown = false;
      };

      let cancel = () => curDown = false;

      let kineticScrollYAnimation;
      let simulateKineticScrollY = (container, currentScrollTop) => {
        let shouldScroll =
          (currentScrollTop == null || container.scrollTop === currentScrollTop)
          && typeof velocityY === "number"
          && container && Math.abs(velocityY) > 0.1;
        if (shouldScroll) {
          container.scrollTop -= velocityY * 0.1;
          let newScrollTop = container.scrollTop;
          kineticScrollYAnimation = requestAnimationFrame(() => simulateKineticScrollY(container, newScrollTop));
          velocityY *= 0.9;
        } else {
          velocityY = 0;
          cancelAnimationFrame(kineticScrollYAnimation);
        }
      };

      let kineticScrollXAnimation;
      let simulateKineticScrollX = (container, currentScrollLeft) => {
        let shouldScroll =
          (currentScrollLeft == null || container.scrollLeft === currentScrollLeft)
          && typeof velocityX === "number"
          && container && Math.abs(velocityX) > 0.1;
        if (shouldScroll) {
          container.scrollLeft -= velocityX * 0.1;
          let newScrollLeft = container.scrollLeft;
          kineticScrollXAnimation = requestAnimationFrame(() => simulateKineticScrollX(container, newScrollLeft));
          velocityX *= 0.9;
        } else {
          velocityX = 0;
          cancelAnimationFrame(kineticScrollXAnimation);
        }
      };

      element.addEventListener('pointermove', move);
      element.addEventListener('pointerdown', down);
      element.addEventListener('pointerup', up);
      window.addEventListener('pointerup', cancel);
      window.addEventListener('pointercancel', cancel);
      return () => {
        velocityX = velocityY = 0;
        cancelAnimationFrame(kineticScrollYAnimation);
        cancelAnimationFrame(kineticScrollXAnimation);
        element.removeEventListener('pointermove', move);
        element.removeEventListener('pointerdown', down);
        element.removeEventListener('pointerup', up);
        window.addEventListener('pointerup', cancel);
        window.addEventListener('pointercancel', cancel);
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

    const getElementWidth = (element) => {
      try {
        const elementComputedStyle = window?.getComputedStyle?.(element, null);
        let elementWidth = element?.getBoundingClientRect?.()?.width;
        elementWidth -=
          parseFloat(elementComputedStyle?.paddingLeft) +
          parseFloat(elementComputedStyle?.paddingRight);
        return elementWidth
      } catch (e) {
        return
      }
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
      return new Promise((resolve, reject) => {
        try {
          localStorage.setItem(LocalStorageID + key, data);
          resolve();
        } catch (ex) {
          reject();
        }
      })
    };

    const removeLocalStorage = (key) => {
      try {
        localStorage.removeItem(LocalStorageID + key);
      } catch (ex) { }
    };

    const appID = writable(null);
    const android$1 = writable(null);
    const inApp = writable(true);
    const progress = writable(0);
    // const anilistAccessToken = writable(null)
    const hasWheel = writable(false);

    const username = writable(getLocalStorage('username') || null);
    const hiddenEntries = writable(null);

    const filterOptions = writable(null);
    const selectedCustomFilter = writable(null);
    const activeTagFilters = writable(null);
    const customFilters = writable(null);
    const loadingFilterOptions = writable(false);
    const finalAnimeList = writable(null);
    const newFinalAnime = writable([]);
    const animeLoaderWorker$1 = writable(null);
    const dataStatus = writable(null);

    const isImporting = writable(false);
    const userRequestIsRunning = writable(null);
    const autoUpdate = writable(getLocalStorage('autoUpdate') ?? null);
    const autoUpdateInterval = writable(null);
    const lastRunnedAutoUpdateDate = writable(null);

    const exportPathIsAvailable = writable(getLocalStorage('exportPathIsAvailable') ?? null);
    const autoExport = writable(getLocalStorage('autoExport') ?? null);
    const autoExportInterval = writable(null);
    const lastRunnedAutoExportDate = writable(null);

    const ytPlayers = writable([]);
    const autoPlay = writable(getLocalStorage('autoPlay') ?? null);

    const initData = writable(true);
    const gridFullView = writable(getLocalStorage('gridFullView') ?? null);
    const showStatus = writable(getLocalStorage('showStatus') ?? true);
    const extraInfo = writable(null);
    const mostRecentAiringDateTimeout = writable(null);
    const earlisetReleaseDate = writable(null);
    const checkAnimeLoaderStatus = writable(false);
    const animeObserver = writable(null);
    const animeIdxRemoved = writable(null);
    const shownAllInList = writable(false);
    const searchedAnimeKeyword = writable(getLocalStorage('searchedAnimeKeyword') || '');
    const confirmPromise = writable(null);
    const menuVisible = writable(false);
    const animeOptionVisible = writable(false);
    const openedAnimeOptionIdx = writable(null);
    const popupVisible = writable(false);
    const openedAnimePopupIdx = writable(null);
    const shouldGoBack = writable(true);
    const listUpdateAvailable = writable(false);
    const listIsUpdating = writable(false);
    const popupIsGoingBack = writable(false);
    const isScrolling = writable(null);
    const scrollingTimeout = writable(null);
    const asyncAnimeReloaded = writable(null);
    const isFullViewed = writable(null);
    const showFilterOptions = writable(getLocalStorage('showFilterOptions') ?? null);
    const dropdownIsVisible = writable(null);
    const confirmIsVisible = writable(null);
    // Reactive Functions
    const runUpdate = writable(null);
    const runExport = writable(null);
    const importantUpdate = writable(null);
    const importantLoad = writable(null);
    const updateRecommendationList = writable(null);
    const updateFilters = writable(null);
    const loadAnime = writable(null);
    const runIsScrolling = writable(null);

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    let loadedRequestUrlPromises = {};
    let loadedRequestUrls = {};
    const cacheRequest = async (url) => {
        if (loadedRequestUrls[url]) {
            return loadedRequestUrls[url]
        } else if (loadedRequestUrlPromises[url]) {
            return loadedRequestUrlPromises[url]
        } else if (!window?.location?.protocol?.includes?.("file")) {
            loadedRequestUrlPromises[url] = new Promise(async (resolve) => {
                let app_id = get_store_value(appID);
                if (typeof app_id !== "number") {
                    loadedRequestUrlPromises[url] = null;
                    resolve(url);
                } else {
                    let newUrl = url + "?v=" + app_id;
                    fetch(newUrl, {
                        headers: {
                            'Cache-Control': 'public, max-age=31536000, immutable',
                        },
                        cache: 'force-cache'
                    }).then(async response => await response.blob())
                        .then(blob => {
                            try {
                                let blobUrl = URL.createObjectURL(blob);
                                loadedRequestUrls[url] = blobUrl;
                                loadedRequestUrlPromises[url] = null;
                                resolve(blobUrl);
                            } catch (e) {
                                loadedRequestUrlPromises[url] = null;
                                resolve(url);
                            }
                        })
                        .catch(() => {
                            loadedRequestUrlPromises[url] = null;
                            resolve(url);
                        });
                }
            });
            return loadedRequestUrlPromises[url]
        } else {
            return url
        }
    };

    const emptyImage$2 = "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    const android = isAndroid();
    let loadedImagePromises = {};
    let loadedImages = {};
    const cacheImage = (url, width, height) => {
        if (loadedImages[url]) {
            return loadedImages[url]
        } else if (loadedImagePromises[url]) {
            return loadedImagePromises[url]
        } else if (window?.location?.origin?.includes?.('https://u-kuro.github.io') && android) {
            loadedImagePromises[url] = new Promise(async (resolve) => {
                let newUrl = "https://cors-anywhere-kuro.vercel.app/api?url=" + url;
                fetch(newUrl, {
                    headers: {
                        'Cache-Control': 'public, max-age=31536000, immutable',
                    },
                    cache: 'force-cache'
                }).then(async response => await response.blob())
                    .then(blob => {
                        try {
                            let imgUrl = URL.createObjectURL(blob);
                            let img = new Image();
                            img.src = imgUrl;
                            img.onload = () => {
                                try {
                                    let canvas = document.createElement('canvas');
                                    canvas.width = width || img.naturalWidth;
                                    canvas.height = height || img.naturalHeight;
                                    let ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0);
                                    canvas.toBlob((blob) => {
                                        try {
                                            let blobUrl = URL.createObjectURL(blob);
                                            loadedImages[url] = blobUrl;
                                            loadedImagePromises[url] = null;
                                            resolve(blobUrl);
                                        } catch (e) {
                                            loadedImages[url] = imgUrl;
                                            loadedImagePromises[url] = null;
                                            resolve(imgUrl);
                                        }
                                    }, 'image/webp', 0.8);
                                } catch (e) {
                                    loadedImages[url] = imgUrl;
                                    loadedImagePromises[url] = null;
                                    resolve(imgUrl);
                                }
                            };
                            img.onerror = () => {
                                loadedImagePromises[url] = null;
                                resolve(url);
                            };
                        } catch (e) {
                            loadedImagePromises[url] = null;
                            resolve(url);
                        }
                    })
                    .catch(e => {
                        loadedImagePromises[url] = null;
                        resolve(url);
                    });
            });
            return loadedImagePromises[url]
        } else if (url) {
            return url
        } else {
            return emptyImage$2
        }
    };

    /* src\components\Anime\AnimeGrid.svelte generated by Svelte v3.59.1 */

    const { console: console_1$6 } = globals;
    const file$8 = "src\\components\\Anime\\AnimeGrid.svelte";

    function get_each_context_3$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[60] = list[i];
    	return child_ctx;
    }

    function get_each_context_4$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[60] = list[i];
    	return child_ctx;
    }

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[60] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[60] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[65] = list[i];
    	child_ctx[66] = list;
    	child_ctx[67] = i;
    	return child_ctx;
    }

    // (802:8) {:else}
    function create_else_block_1$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "No Results";
    			attr_dev(div, "class", "empty svelte-1l8b2er");
    			add_location(div, file$8, 802, 12, 35047);
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
    		id: create_else_block_1$2.name,
    		type: "else",
    		source: "(802:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (793:48) 
    function create_if_block_8$2(ctx) {
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
    		id: create_if_block_8$2.name,
    		type: "if",
    		source: "(793:48) ",
    		ctx
    	});

    	return block;
    }

    // (647:8) {#if $finalAnimeList?.length}
    function create_if_block_1$5(ctx) {
    	let each_blocks_2 = [];
    	let each0_lookup = new Map();
    	let t0;
    	let t1;
    	let each2_anchor;
    	let each_value_2 = /*$finalAnimeList*/ ctx[12] || [];
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*anime*/ ctx[65]?.id ?? {};
    	validate_each_keys(ctx, each_value_2, get_each_context_2$2, get_key);

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2$2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_2[i] = create_each_block_2$2(key, child_ctx));
    	}

    	let each_value_1 = Array(/*$shownAllInList*/ ctx[11] ? 0 : 1);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	let each_value = Array(/*isFullViewed*/ ctx[2]
    	? Math.floor((/*windowHeight*/ ctx[0] ?? 1100) / 220)
    	: 5);

    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
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
    			if (dirty[0] & /*$finalAnimeList, $popupVisible, handleOpenPopup, handleOpenOption, cancelOpenOption, $earlisetReleaseDate, numberOfLoadedGrid*/ 504832) {
    				each_value_2 = /*$finalAnimeList*/ ctx[12] || [];
    				validate_each_argument(each_value_2);
    				validate_each_keys(ctx, each_value_2, get_each_context_2$2, get_key);
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key, 1, ctx, each_value_2, each0_lookup, t0.parentNode, destroy_block, create_each_block_2$2, t0, get_each_context_2$2);
    			}

    			if (dirty[0] & /*$shownAllInList*/ 2048) {
    				each_value_1 = Array(/*$shownAllInList*/ ctx[11] ? 0 : 1);
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

    			if (dirty[0] & /*isFullViewed, windowHeight*/ 5) {
    				each_value = Array(/*isFullViewed*/ ctx[2]
    				? Math.floor((/*windowHeight*/ ctx[0] ?? 1100) / 220)
    				: 5);

    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
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
    		source: "(647:8) {#if $finalAnimeList?.length}",
    		ctx
    	});

    	return block;
    }

    // (794:12) {#each Array(21) as _}
    function create_each_block_4$1(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "shimmer svelte-1l8b2er");
    			add_location(div0, file$8, 795, 20, 34836);
    			attr_dev(div1, "class", "image-grid__card skeleton dummy svelte-1l8b2er");
    			add_location(div1, file$8, 794, 16, 34769);
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
    		source: "(794:12) {#each Array(21) as _}",
    		ctx
    	});

    	return block;
    }

    // (799:12) {#each Array(5) as _}
    function create_each_block_3$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "image-grid__card dummy svelte-1l8b2er");
    			add_location(div, file$8, 799, 16, 34957);
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
    		source: "(799:12) {#each Array(5) as _}",
    		ctx
    	});

    	return block;
    }

    // (666:24) {#if anime?.coverImageUrl || anime?.bannerImageUrl || anime?.trailerThumbnailUrl}
    function create_if_block_7$2(ctx) {
    	let img;
    	let img_fetchpriority_value;
    	let img_loading_value;
    	let img_alt_value;
    	let addImage_action;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			img = element("img");

    			attr_dev(img, "fetchpriority", img_fetchpriority_value = /*animeIdx*/ ctx[67] > /*numberOfLoadedGrid*/ ctx[15]
    			? ""
    			: "high");

    			attr_dev(img, "loading", img_loading_value = /*animeIdx*/ ctx[67] > /*numberOfLoadedGrid*/ ctx[15]
    			? "lazy"
    			: "eager");

    			attr_dev(img, "class", "" + (null_to_empty("image-grid__card-thumb  fade-out") + " svelte-1l8b2er"));
    			attr_dev(img, "alt", img_alt_value = (/*anime*/ ctx[65]?.shownTitle || "") + " Cover");
    			attr_dev(img, "width", "180px");
    			attr_dev(img, "height", "254.531px");
    			add_location(img, file$8, 666, 28, 26615);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(addImage_action = /*addImage*/ ctx[20].call(null, img, /*anime*/ ctx[65]?.coverImageUrl || /*anime*/ ctx[65]?.bannerImageUrl || /*anime*/ ctx[65]?.trailerThumbnailUrl || emptyImage$1)),
    					listen_dev(img, "load", /*load_handler*/ ctx[24], false, false, false, false),
    					listen_dev(img, "error", /*error_handler*/ ctx[25], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && img_fetchpriority_value !== (img_fetchpriority_value = /*animeIdx*/ ctx[67] > /*numberOfLoadedGrid*/ ctx[15]
    			? ""
    			: "high")) {
    				attr_dev(img, "fetchpriority", img_fetchpriority_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && img_loading_value !== (img_loading_value = /*animeIdx*/ ctx[67] > /*numberOfLoadedGrid*/ ctx[15]
    			? "lazy"
    			: "eager")) {
    				attr_dev(img, "loading", img_loading_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && img_alt_value !== (img_alt_value = (/*anime*/ ctx[65]?.shownTitle || "") + " Cover")) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (addImage_action && is_function(addImage_action.update) && dirty[0] & /*$finalAnimeList*/ 4096) addImage_action.update.call(null, /*anime*/ ctx[65]?.coverImageUrl || /*anime*/ ctx[65]?.bannerImageUrl || /*anime*/ ctx[65]?.trailerThumbnailUrl || emptyImage$1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7$2.name,
    		type: "if",
    		source: "(666:24) {#if anime?.coverImageUrl || anime?.bannerImageUrl || anime?.trailerThumbnailUrl}",
    		ctx
    	});

    	return block;
    }

    // (725:40) {:else}
    function create_else_block$2(ctx) {
    	let t_value = `${/*anime*/ ctx[65].format || "N/A"}${/*anime*/ ctx[65].episodes
	? "(" + /*anime*/ ctx[65].episodes + ")"
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
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t_value !== (t_value = `${/*anime*/ ctx[65].format || "N/A"}${/*anime*/ ctx[65].episodes
			? "(" + /*anime*/ ctx[65].episodes + ")"
			: ""}` + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(725:40) {:else}",
    		ctx
    	});

    	return block;
    }

    // (717:40) {#if isJsonObject(anime?.nextAiringEpisode)}
    function create_if_block_6$2(ctx) {
    	let t0_value = `${/*anime*/ ctx[65].format || "N/A"}` + "";
    	let t0;
    	let t1;
    	let previous_key = /*$earlisetReleaseDate*/ ctx[13] || 1;
    	let key_block_anchor;
    	let key_block = create_key_block$1(ctx);

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			key_block.c();
    			key_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			key_block.m(target, anchor);
    			insert_dev(target, key_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t0_value !== (t0_value = `${/*anime*/ ctx[65].format || "N/A"}` + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$earlisetReleaseDate*/ 8192 && safe_not_equal(previous_key, previous_key = /*$earlisetReleaseDate*/ ctx[13] || 1)) {
    				key_block.d(1);
    				key_block = create_key_block$1(ctx);
    				key_block.c();
    				key_block.m(key_block_anchor.parentNode, key_block_anchor);
    			} else {
    				key_block.p(ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(key_block_anchor);
    			key_block.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6$2.name,
    		type: "if",
    		source: "(717:40) {#if isJsonObject(anime?.nextAiringEpisode)}",
    		ctx
    	});

    	return block;
    }

    // (719:44) {#key $earlisetReleaseDate || 1}
    function create_key_block$1(ctx) {
    	let t_value = getFinishedEpisode(/*anime*/ ctx[65].episodes, /*anime*/ ctx[65].nextAiringEpisode) + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t_value !== (t_value = getFinishedEpisode(/*anime*/ ctx[65].episodes, /*anime*/ ctx[65].nextAiringEpisode) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block$1.name,
    		type: "key",
    		source: "(719:44) {#key $earlisetReleaseDate || 1}",
    		ctx
    	});

    	return block;
    }

    // (767:79) 
    function create_if_block_5$2(ctx) {
    	let svg;
    	let path;
    	let svg_class_value;
    	let t0;
    	let t1_value = (/*anime*/ ctx[65]?.shownActivity ?? "N/A") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M64 64a32 32 0 1 0-64 0v336c0 44 36 80 80 80h400a32 32 0 1 0 0-64H80c-9 0-16-7-16-16V64zm407 87a32 32 0 0 0-46-46L320 211l-57-58a32 32 0 0 0-46 0L105 265a32 32 0 0 0 46 46l89-90 57 58c13 12 33 12 46 0l128-128z");
    			add_location(path, file$8, 771, 48, 33557);
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "class", svg_class_value = "" + (null_to_empty(`${/*anime*/ ctx[65]?.contentCautionColor}-fill score`) + " svelte-1l8b2er"));
    			add_location(svg, file$8, 767, 44, 33285);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && svg_class_value !== (svg_class_value = "" + (null_to_empty(`${/*anime*/ ctx[65]?.contentCautionColor}-fill score`) + " svelte-1l8b2er"))) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t1_value !== (t1_value = (/*anime*/ ctx[65]?.shownActivity ?? "N/A") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$2.name,
    		type: "if",
    		source: "(767:79) ",
    		ctx
    	});

    	return block;
    }

    // (757:80) 
    function create_if_block_4$2(ctx) {
    	let svg;
    	let path;
    	let svg_class_value;
    	let t0;
    	let t1_value = (/*anime*/ ctx[65]?.shownFavorites ?? "N/A") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(path, "d", "m48 300 180 169a41 41 0 0 0 56 0l180-169c31-28 48-68 48-109v-6A143 143 0 0 0 268 84l-12 12-12-12A143 143 0 0 0 0 185v6c0 41 17 81 48 109z");
    			add_location(path, file$8, 761, 48, 32776);
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "class", svg_class_value = "" + (null_to_empty(`${/*anime*/ ctx[65]?.contentCautionColor}-fill score`) + " svelte-1l8b2er"));
    			add_location(svg, file$8, 757, 44, 32504);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && svg_class_value !== (svg_class_value = "" + (null_to_empty(`${/*anime*/ ctx[65]?.contentCautionColor}-fill score`) + " svelte-1l8b2er"))) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t1_value !== (t1_value = (/*anime*/ ctx[65]?.shownFavorites ?? "N/A") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(757:80) ",
    		ctx
    	});

    	return block;
    }

    // (746:76) 
    function create_if_block_3$3(ctx) {
    	let svg;
    	let path;
    	let svg_class_value;
    	let t0;
    	let t1_value = (/*anime*/ ctx[65]?.shownCount ?? "N/A") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M96 128a128 128 0 1 1 256 0 128 128 0 1 1-256 0zM0 482c0-98 80-178 178-178h92c98 0 178 80 178 178 0 17-13 30-30 30H30c-17 0-30-13-30-30zm609 30H471c6-9 9-20 9-32v-8c0-61-27-115-70-152h69c89 0 161 72 161 161 0 17-14 31-31 31zM432 256c-31 0-59-13-79-33a159 159 0 0 0 13-169 112 112 0 1 1 66 202z");
    			add_location(path, file$8, 751, 48, 31842);
    			attr_dev(svg, "viewBox", "0 0 640 512");
    			attr_dev(svg, "class", svg_class_value = "" + (null_to_empty(`${/*anime*/ ctx[65]?.contentCautionColor}-fill score`) + " svelte-1l8b2er"));
    			add_location(svg, file$8, 747, 44, 31570);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && svg_class_value !== (svg_class_value = "" + (null_to_empty(`${/*anime*/ ctx[65]?.contentCautionColor}-fill score`) + " svelte-1l8b2er"))) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t1_value !== (t1_value = (/*anime*/ ctx[65]?.shownCount ?? "N/A") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$3.name,
    		type: "if",
    		source: "(746:76) ",
    		ctx
    	});

    	return block;
    }

    // (736:40) {#if anime?.shownScore != null}
    function create_if_block_2$3(ctx) {
    	let svg;
    	let path;
    	let svg_class_value;
    	let t0;
    	let t1_value = (/*anime*/ ctx[65]?.shownScore ?? "N/A") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M317 18a32 32 0 0 0-58 0l-64 132-144 22a32 32 0 0 0-17 54l104 103-25 146a32 32 0 0 0 47 33l128-68 129 68a32 32 0 0 0 46-33l-24-146 104-103a32 32 0 0 0-18-54l-144-22-64-132z");
    			add_location(path, file$8, 740, 49, 30972);
    			attr_dev(svg, "viewBox", "0 0 576 512");
    			attr_dev(svg, "class", svg_class_value = "" + (null_to_empty(`${/*anime*/ ctx[65]?.contentCautionColor}-fill score`) + " svelte-1l8b2er"));
    			add_location(svg, file$8, 737, 44, 30746);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && svg_class_value !== (svg_class_value = "" + (null_to_empty(`${/*anime*/ ctx[65]?.contentCautionColor}-fill score`) + " svelte-1l8b2er"))) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t1_value !== (t1_value = (/*anime*/ ctx[65]?.shownScore ?? "N/A") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(736:40) {#if anime?.shownScore != null}",
    		ctx
    	});

    	return block;
    }

    // (648:12) {#each $finalAnimeList || [] as anime, animeIdx (anime?.id ?? {}
    function create_each_block_2$2(key_1, ctx) {
    	let div3;
    	let div2;
    	let t0;
    	let span4;
    	let span0;
    	let t1_value = (/*anime*/ ctx[65]?.shownTitle || "N/A") + "";
    	let t1;
    	let span0_copy_value_value;
    	let span0_copy_value___value;
    	let t2;
    	let span3;
    	let div0;
    	let span1;
    	let svg;
    	let path;
    	let svg_class_value;
    	let t3;
    	let show_if;
    	let t4;
    	let div1;
    	let span2;
    	let span3_copy_value_value;
    	let span3_copy_value___value;
    	let div2_tabindex_value;
    	let div3_class_value;
    	let div3_title_value;
    	let each_value_2 = /*each_value_2*/ ctx[66];
    	let animeIdx = /*animeIdx*/ ctx[67];
    	let mounted;
    	let dispose;
    	let if_block0 = (/*anime*/ ctx[65]?.coverImageUrl || /*anime*/ ctx[65]?.bannerImageUrl || /*anime*/ ctx[65]?.trailerThumbnailUrl) && create_if_block_7$2(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (dirty[0] & /*$finalAnimeList*/ 4096) show_if = null;
    		if (show_if == null) show_if = !!isJsonObject(/*anime*/ ctx[65]?.nextAiringEpisode);
    		if (show_if) return create_if_block_6$2;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type_1(ctx, [-1, -1, -1]);
    	let if_block1 = current_block_type(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*anime*/ ctx[65]?.shownScore != null) return create_if_block_2$3;
    		if (/*anime*/ ctx[65]?.shownCount != null) return create_if_block_3$3;
    		if (/*anime*/ ctx[65]?.shownFavorites != null) return create_if_block_4$2;
    		if (/*anime*/ ctx[65]?.shownActivity != null) return create_if_block_5$2;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block2 = current_block_type_1 && current_block_type_1(ctx);

    	function pointerdown_handler(...args) {
    		return /*pointerdown_handler*/ ctx[26](/*animeIdx*/ ctx[67], ...args);
    	}

    	function keydown_handler(...args) {
    		return /*keydown_handler*/ ctx[27](/*animeIdx*/ ctx[67], ...args);
    	}

    	const assign_div3 = () => /*div3_binding*/ ctx[28](div3, each_value_2, animeIdx);
    	const unassign_div3 = () => /*div3_binding*/ ctx[28](null, each_value_2, animeIdx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			span4 = element("span");
    			span0 = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			span3 = element("span");
    			div0 = element("div");
    			span1 = element("span");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t3 = space();
    			if_block1.c();
    			t4 = space();
    			div1 = element("div");
    			span2 = element("span");
    			if (if_block2) if_block2.c();
    			attr_dev(span0, "class", "title copy svelte-1l8b2er");
    			attr_dev(span0, "copy-value", span0_copy_value_value = /*anime*/ ctx[65]?.copiedTitle || "");
    			attr_dev(span0, "copy-value-2", span0_copy_value___value = /*anime*/ ctx[65]?.shownTitle || "");
    			add_location(span0, file$8, 695, 28, 28209);
    			attr_dev(path, "d", "M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512z");
    			add_location(path, file$8, 712, 45, 29195);
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "class", svg_class_value = "" + (null_to_empty(`${/*anime*/ ctx[65]?.userStatusColor}-fill circle`) + " svelte-1l8b2er"));
    			add_location(svg, file$8, 709, 40, 28984);
    			attr_dev(span1, "class", "svelte-1l8b2er");
    			add_location(span1, file$8, 707, 36, 28879);
    			attr_dev(div0, "class", "brief-info svelte-1l8b2er");
    			add_location(div0, file$8, 706, 32, 28817);
    			attr_dev(span2, "class", "svelte-1l8b2er");
    			add_location(span2, file$8, 734, 36, 30562);
    			attr_dev(div1, "class", "brief-info svelte-1l8b2er");
    			add_location(div1, file$8, 733, 32, 30500);
    			attr_dev(span3, "class", "brief-info-wrapper copy svelte-1l8b2er");
    			attr_dev(span3, "copy-value", span3_copy_value_value = /*anime*/ ctx[65]?.copiedTitle || "");
    			attr_dev(span3, "copy-value-2", span3_copy_value___value = /*anime*/ ctx[65]?.shownTitle || "");
    			add_location(span3, file$8, 701, 28, 28539);
    			attr_dev(span4, "class", "image-grid__card-title svelte-1l8b2er");
    			add_location(span4, file$8, 694, 24, 28142);
    			attr_dev(div2, "class", "shimmer svelte-1l8b2er");
    			attr_dev(div2, "tabindex", div2_tabindex_value = /*$popupVisible*/ ctx[10] ? "" : "0");
    			add_location(div2, file$8, 655, 20, 25969);
    			attr_dev(div3, "class", div3_class_value = "" + (null_to_empty("image-grid__card" + ((/*anime*/ ctx[65]?.isLoading) ? " loading" : "")) + " svelte-1l8b2er"));
    			attr_dev(div3, "title", div3_title_value = /*anime*/ ctx[65]?.briefInfo || "");
    			add_location(div3, file$8, 648, 16, 25633);
    			this.first = div3;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t0);
    			append_dev(div2, span4);
    			append_dev(span4, span0);
    			append_dev(span0, t1);
    			append_dev(span4, t2);
    			append_dev(span4, span3);
    			append_dev(span3, div0);
    			append_dev(div0, span1);
    			append_dev(span1, svg);
    			append_dev(svg, path);
    			append_dev(span1, t3);
    			if_block1.m(span1, null);
    			append_dev(span3, t4);
    			append_dev(span3, div1);
    			append_dev(div1, span2);
    			if (if_block2) if_block2.m(span2, null);
    			assign_div3();

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						div2,
    						"click",
    						function () {
    							if (is_function(/*handleOpenPopup*/ ctx[16](/*animeIdx*/ ctx[67]))) /*handleOpenPopup*/ ctx[16](/*animeIdx*/ ctx[67]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(div2, "pointerdown", pointerdown_handler, false, false, false, false),
    					listen_dev(div2, "pointerup", /*cancelOpenOption*/ ctx[18], false, false, false, false),
    					listen_dev(div2, "pointercancel", /*cancelOpenOption*/ ctx[18], false, false, false, false),
    					listen_dev(div2, "keydown", keydown_handler, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*anime*/ ctx[65]?.coverImageUrl || /*anime*/ ctx[65]?.bannerImageUrl || /*anime*/ ctx[65]?.trailerThumbnailUrl) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_7$2(ctx);
    					if_block0.c();
    					if_block0.m(div2, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t1_value !== (t1_value = (/*anime*/ ctx[65]?.shownTitle || "N/A") + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && span0_copy_value_value !== (span0_copy_value_value = /*anime*/ ctx[65]?.copiedTitle || "")) {
    				attr_dev(span0, "copy-value", span0_copy_value_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && span0_copy_value___value !== (span0_copy_value___value = /*anime*/ ctx[65]?.shownTitle || "")) {
    				attr_dev(span0, "copy-value-2", span0_copy_value___value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && svg_class_value !== (svg_class_value = "" + (null_to_empty(`${/*anime*/ ctx[65]?.userStatusColor}-fill circle`) + " svelte-1l8b2er"))) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx, dirty)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(span1, null);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_2(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if (if_block2) if_block2.d(1);
    				if_block2 = current_block_type_1 && current_block_type_1(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(span2, null);
    				}
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && span3_copy_value_value !== (span3_copy_value_value = /*anime*/ ctx[65]?.copiedTitle || "")) {
    				attr_dev(span3, "copy-value", span3_copy_value_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && span3_copy_value___value !== (span3_copy_value___value = /*anime*/ ctx[65]?.shownTitle || "")) {
    				attr_dev(span3, "copy-value-2", span3_copy_value___value);
    			}

    			if (dirty[0] & /*$popupVisible*/ 1024 && div2_tabindex_value !== (div2_tabindex_value = /*$popupVisible*/ ctx[10] ? "" : "0")) {
    				attr_dev(div2, "tabindex", div2_tabindex_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && div3_class_value !== (div3_class_value = "" + (null_to_empty("image-grid__card" + ((/*anime*/ ctx[65]?.isLoading) ? " loading" : "")) + " svelte-1l8b2er"))) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && div3_title_value !== (div3_title_value = /*anime*/ ctx[65]?.briefInfo || "")) {
    				attr_dev(div3, "title", div3_title_value);
    			}

    			if (each_value_2 !== /*each_value_2*/ ctx[66] || animeIdx !== /*animeIdx*/ ctx[67]) {
    				unassign_div3();
    				each_value_2 = /*each_value_2*/ ctx[66];
    				animeIdx = /*animeIdx*/ ctx[67];
    				assign_div3();
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block0) if_block0.d();
    			if_block1.d();

    			if (if_block2) {
    				if_block2.d();
    			}

    			unassign_div3();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$2.name,
    		type: "each",
    		source: "(648:12) {#each $finalAnimeList || [] as anime, animeIdx (anime?.id ?? {}",
    		ctx
    	});

    	return block;
    }

    // (785:12) {#each Array($shownAllInList ? 0 : 1) as _}
    function create_each_block_1$2(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "shimmer svelte-1l8b2er");
    			add_location(div0, file$8, 786, 20, 34427);
    			attr_dev(div1, "class", "image-grid__card skeleton dummy svelte-1l8b2er");
    			add_location(div1, file$8, 785, 16, 34360);
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
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(785:12) {#each Array($shownAllInList ? 0 : 1) as _}",
    		ctx
    	});

    	return block;
    }

    // (790:12) {#each Array(isFullViewed ? Math.floor((windowHeight ?? 1100) / 220) : 5) as _}
    function create_each_block$3(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "image-grid__card dummy svelte-1l8b2er");
    			add_location(div, file$8, 790, 16, 34606);
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
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(790:12) {#each Array(isFullViewed ? Math.floor((windowHeight ?? 1100) / 220) : 5) as _}",
    		ctx
    	});

    	return block;
    }

    // (806:4) {#if !$android && shouldShowGoBackInFullView && $finalAnimeList?.length}
    function create_if_block$6(ctx) {
    	let div;
    	let svg;
    	let path;
    	let path_d_value;
    	let svg_viewBox_value;
    	let div_class_value;
    	let div_outro;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");

    			attr_dev(path, "d", path_d_value = // angle left
    			/*shouldShowGoBackInFullView*/ ctx[8]
    			? "M41 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 256l138-137a32 32 0 0 0-46-46L41 233z"
    			: // angle up
    				"M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z");

    			add_location(path, file$8, 820, 16, 35724);
    			attr_dev(svg, "viewBox", svg_viewBox_value = `0 0 ${/*shouldShowGoBackInFullView*/ ctx[8] ? "320" : "448"} 512`);
    			attr_dev(svg, "class", "svelte-1l8b2er");
    			add_location(svg, file$8, 815, 12, 35564);
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("go-back-grid" + (/*shouldShowGoBackInFullView*/ ctx[8] ? " fullView" : "")) + " svelte-1l8b2er"));
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file$8, 807, 8, 35261);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*goBackGrid*/ ctx[19], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_1*/ ctx[32], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*shouldShowGoBackInFullView*/ 256 && path_d_value !== (path_d_value = // angle left
    			/*shouldShowGoBackInFullView*/ ctx[8]
    			? "M41 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 256l138-137a32 32 0 0 0-46-46L41 233z"
    			: // angle up
    				"M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z")) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (!current || dirty[0] & /*shouldShowGoBackInFullView*/ 256 && svg_viewBox_value !== (svg_viewBox_value = `0 0 ${/*shouldShowGoBackInFullView*/ ctx[8] ? "320" : "448"} 512`)) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}

    			if (!current || dirty[0] & /*shouldShowGoBackInFullView*/ 256 && div_class_value !== (div_class_value = "" + (null_to_empty("go-back-grid" + (/*shouldShowGoBackInFullView*/ ctx[8] ? " fullView" : "")) + " svelte-1l8b2er"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (div_outro) div_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			div_outro = create_out_transition(div, fade, { duration: 200 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_outro) div_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(806:4) {#if !$android && shouldShowGoBackInFullView && $finalAnimeList?.length}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let main;
    	let div;
    	let div_class_value;
    	let t;
    	let main_class_value;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*$finalAnimeList*/ ctx[12]?.length) return create_if_block_1$5;
    		if (!/*$finalAnimeList*/ ctx[12] || /*$initData*/ ctx[14]) return create_if_block_8$2;
    		return create_else_block_1$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = !/*$android*/ ctx[9] && /*shouldShowGoBackInFullView*/ ctx[8] && /*$finalAnimeList*/ ctx[12]?.length && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "id", "anime-grid");

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("image-grid " + (/*isFullViewed*/ ctx[2] ? " fullView" : "") + (/*$finalAnimeList*/ ctx[12]?.length === 0 && !/*$initData*/ ctx[14]
    			? " empty"
    			: "")) + " svelte-1l8b2er"));

    			set_style(div, "--anime-grid-height", /*windowHeight*/ ctx[0] + "px");
    			add_location(div, file$8, 615, 4, 24281);
    			attr_dev(main, "class", main_class_value = "" + (null_to_empty(/*isFullViewed*/ ctx[2] ? "fullView" : "") + " svelte-1l8b2er"));
    			add_location(main, file$8, 614, 0, 24230);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			if_block0.m(div, null);
    			/*div_binding*/ ctx[29](div);
    			append_dev(main, t);
    			if (if_block1) if_block1.m(main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "wheel", /*wheel_handler*/ ctx[30], false, false, false, false),
    					listen_dev(div, "scroll", /*scroll_handler*/ ctx[31], false, false, false, false)
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
    					if_block0.m(div, null);
    				}
    			}

    			if (!current || dirty[0] & /*isFullViewed, $finalAnimeList, $initData*/ 20484 && div_class_value !== (div_class_value = "" + (null_to_empty("image-grid " + (/*isFullViewed*/ ctx[2] ? " fullView" : "") + (/*$finalAnimeList*/ ctx[12]?.length === 0 && !/*$initData*/ ctx[14]
    			? " empty"
    			: "")) + " svelte-1l8b2er"))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty[0] & /*windowHeight*/ 1) {
    				set_style(div, "--anime-grid-height", /*windowHeight*/ ctx[0] + "px");
    			}

    			if (!/*$android*/ ctx[9] && /*shouldShowGoBackInFullView*/ ctx[8] && /*$finalAnimeList*/ ctx[12]?.length) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$android, shouldShowGoBackInFullView, $finalAnimeList*/ 4864) {
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

    			if (!current || dirty[0] & /*isFullViewed*/ 4 && main_class_value !== (main_class_value = "" + (null_to_empty(/*isFullViewed*/ ctx[2] ? "fullView" : "") + " svelte-1l8b2er"))) {
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
    			/*div_binding*/ ctx[29](null);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const emptyImage$1 = "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

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

    	if (timeDifMS > 0 && episodes >= 1 && episodes >= nextEpisode) {
    		return `(${Math.max(nextEpisode - 1, 0)}/${episodes})`;
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

    function horizontalWheel$2(event, parentClass) {
    	let element = event.target;
    	let classList = element.classList;

    	if (!classList.contains(parentClass)) {
    		element = element.closest("." + parentClass);
    	}

    	if (element.scrollWidth <= element.clientWidth) return;

    	if (event.deltaY !== 0 && event.deltaX === 0) {
    		event.preventDefault();
    		event.stopPropagation();
    		element.scrollLeft = Math.max(0, element.scrollLeft + event.deltaY);
    	}
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let shouldShowGoBackInFullView;
    	let $android;
    	let $gridFullView;
    	let $animeOptionVisible;
    	let $openedAnimeOptionIdx;
    	let $popupVisible;
    	let $openedAnimePopupIdx;
    	let $animeLoaderWorker;
    	let $checkAnimeLoaderStatus;
    	let $shownAllInList;
    	let $asyncAnimeReloaded;
    	let $animeObserver;
    	let $finalAnimeList;
    	let $progress;
    	let $dataStatus;
    	let $animeIdxRemoved;
    	let $newFinalAnime;
    	let $mostRecentAiringDateTimeout;
    	let $earlisetReleaseDate;
    	let $selectedCustomFilter;
    	let $loadingFilterOptions;
    	let $filterOptions;
    	let $importantLoad;
    	let $initData;
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(9, $android = $$value));
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(23, $gridFullView = $$value));
    	validate_store(animeOptionVisible, 'animeOptionVisible');
    	component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(43, $animeOptionVisible = $$value));
    	validate_store(openedAnimeOptionIdx, 'openedAnimeOptionIdx');
    	component_subscribe($$self, openedAnimeOptionIdx, $$value => $$invalidate(44, $openedAnimeOptionIdx = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(10, $popupVisible = $$value));
    	validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
    	component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(45, $openedAnimePopupIdx = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(46, $animeLoaderWorker = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(47, $checkAnimeLoaderStatus = $$value));
    	validate_store(shownAllInList, 'shownAllInList');
    	component_subscribe($$self, shownAllInList, $$value => $$invalidate(11, $shownAllInList = $$value));
    	validate_store(asyncAnimeReloaded, 'asyncAnimeReloaded');
    	component_subscribe($$self, asyncAnimeReloaded, $$value => $$invalidate(48, $asyncAnimeReloaded = $$value));
    	validate_store(animeObserver, 'animeObserver');
    	component_subscribe($$self, animeObserver, $$value => $$invalidate(49, $animeObserver = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(12, $finalAnimeList = $$value));
    	validate_store(progress, 'progress');
    	component_subscribe($$self, progress, $$value => $$invalidate(50, $progress = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(51, $dataStatus = $$value));
    	validate_store(animeIdxRemoved, 'animeIdxRemoved');
    	component_subscribe($$self, animeIdxRemoved, $$value => $$invalidate(52, $animeIdxRemoved = $$value));
    	validate_store(newFinalAnime, 'newFinalAnime');
    	component_subscribe($$self, newFinalAnime, $$value => $$invalidate(53, $newFinalAnime = $$value));
    	validate_store(mostRecentAiringDateTimeout, 'mostRecentAiringDateTimeout');
    	component_subscribe($$self, mostRecentAiringDateTimeout, $$value => $$invalidate(54, $mostRecentAiringDateTimeout = $$value));
    	validate_store(earlisetReleaseDate, 'earlisetReleaseDate');
    	component_subscribe($$self, earlisetReleaseDate, $$value => $$invalidate(13, $earlisetReleaseDate = $$value));
    	validate_store(selectedCustomFilter, 'selectedCustomFilter');
    	component_subscribe($$self, selectedCustomFilter, $$value => $$invalidate(55, $selectedCustomFilter = $$value));
    	validate_store(loadingFilterOptions, 'loadingFilterOptions');
    	component_subscribe($$self, loadingFilterOptions, $$value => $$invalidate(56, $loadingFilterOptions = $$value));
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(57, $filterOptions = $$value));
    	validate_store(importantLoad, 'importantLoad');
    	component_subscribe($$self, importantLoad, $$value => $$invalidate(58, $importantLoad = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(14, $initData = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AnimeGrid', slots, []);
    	let windowHeight = Math.max(window.visualViewport.height, window.innerHeight);
    	let windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth);
    	let shownFinalAnimeListCount = 0;
    	let animeGridEl;
    	let isRunningIntersectEvent;
    	let numberOfLoadedGrid = 1;

    	// let observerDelay = 0;
    	function addLastAnimeObserver() {
    		$animeObserver?.disconnect?.();
    		set_store_value(animeObserver, $animeObserver = null, $animeObserver);
    		isRunningIntersectEvent = false;

    		set_store_value(
    			animeObserver,
    			$animeObserver = new IntersectionObserver(entries => {
    					if ($shownAllInList) return;

    					entries.forEach(entry => {
    						if (entry.isIntersecting) {
    							if (isRunningIntersectEvent) return;
    							isRunningIntersectEvent = true;

    							requestAnimationFrame(() => {
    								if ($animeLoaderWorker instanceof Worker) {
    									$checkAnimeLoaderStatus().then(() => {
    										$animeLoaderWorker?.postMessage?.({ loadMore: true });
    									});
    								}

    								isRunningIntersectEvent = false;
    							});
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

    		Array.from(document.querySelectorAll(".image-grid__card.dummy") || []).forEach(entry => {
    			$animeObserver.observe(entry);
    		});
    	}

    	let errorCountMult = 5;
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
    							1000 * errorCountMult
    						);
    					}).catch(() => {
    					++errorCountMult;
    					$animeLoaderWorker?.terminate?.();
    					set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
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

    				if (data?.hasOwnProperty?.("progress")) {
    					if (data?.progress >= 0 && data?.progress <= 100) {
    						progress.set(data.progress);
    					}
    				}

    				if (data?.hasOwnProperty?.("status")) {
    					set_store_value(dataStatus, $dataStatus = data.status, $dataStatus);
    				} else if (data?.filterOptions && typeof data?.selectedCustomFilter === "string") {
    					setLocalStorage("selectedCustomFilter", data?.selectedCustomFilter).catch(() => {
    						removeLocalStorage("selectedCustomFilter");
    					});

    					set_store_value(filterOptions, $filterOptions = data.filterOptions, $filterOptions);
    					set_store_value(loadingFilterOptions, $loadingFilterOptions = false, $loadingFilterOptions);
    				} else if (typeof data?.changedCustomFilter === "string" && data?.changedCustomFilter) {
    					set_store_value(selectedCustomFilter, $selectedCustomFilter = data.changedCustomFilter, $selectedCustomFilter);
    				} else if (data.getEarlisetReleaseDate === true) {
    					if (data.earliestReleaseDate && data?.timeBeforeEarliestReleaseDate > 0 && (data.earliestReleaseDate < $earlisetReleaseDate || new Date($earlisetReleaseDate) < new Date() || !$earlisetReleaseDate)) {
    						set_store_value(earlisetReleaseDate, $earlisetReleaseDate = data.earliestReleaseDate, $earlisetReleaseDate);
    						clearTimeout($mostRecentAiringDateTimeout);

    						set_store_value(
    							mostRecentAiringDateTimeout,
    							$mostRecentAiringDateTimeout = setTimeout(
    								() => {
    									if ($animeLoaderWorker instanceof Worker) {
    										$checkAnimeLoaderStatus().then(() => {
    											$animeLoaderWorker?.postMessage?.({ getEarlisetReleaseDate: true });
    										});
    									}
    								},
    								Math.min(data.timeBeforeEarliestReleaseDate, 2000000000)
    							),
    							$mostRecentAiringDateTimeout
    						);
    					}
    				} else if (data.finalAnimeList instanceof Array) {
    					if (data?.reload === true) {
    						if ($finalAnimeList instanceof Array) {
    							set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    						}

    						data?.finalAnimeList?.forEach?.((anime, idx) => {
    							set_store_value(
    								newFinalAnime,
    								$newFinalAnime = {
    									id: anime.id,
    									idx: data.shownAnimeListCount + idx,
    									finalAnimeList: anime
    								},
    								$newFinalAnime
    							);
    						});

    						isAsyncLoad = true;
    					} else if (data.isNew === true) {
    						if ($finalAnimeList instanceof Array) {
    							set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    						}

    						data?.finalAnimeList?.forEach?.((anime, idx) => {
    							set_store_value(
    								newFinalAnime,
    								$newFinalAnime = {
    									idx: data.shownAnimeListCount + idx,
    									finalAnimeList: anime
    								},
    								$newFinalAnime
    							);
    						});
    					} else if (data.isNew === false) {
    						if ($finalAnimeList instanceof Array) {
    							data?.finalAnimeList?.forEach?.((anime, idx) => {
    								set_store_value(
    									newFinalAnime,
    									$newFinalAnime = {
    										idx: data.shownAnimeListCount + idx,
    										finalAnimeList: anime
    									},
    									$newFinalAnime
    								);
    							});

    							if (data.isLast) {
    								set_store_value(shownAllInList, $shownAllInList = true, $shownAllInList);
    								$animeObserver?.disconnect?.();
    								set_store_value(animeObserver, $animeObserver = null, $animeObserver);
    							}
    						}
    					}

    					val?.postMessage?.({ getEarlisetReleaseDate: true });
    				} else if (data.isRemoved === true && typeof data.removedID === "number") {
    					let maxGridElIdx = Math.max($finalAnimeList.length - 2, 0);
    					let gridElement = $finalAnimeList[maxGridElIdx].gridElement || animeGridEl.children?.[maxGridElIdx];

    					if ($animeObserver instanceof IntersectionObserver && gridElement instanceof Element) {
    						$animeObserver.observe(gridElement);
    					}

    					let removedIdx = $finalAnimeList.findIndex(({ id }) => id === data.removedID);
    					set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList.filter(({ id }) => id !== data.removedID), $finalAnimeList);

    					if (removedIdx >= 0) {
    						set_store_value(animeIdxRemoved, $animeIdxRemoved = null, $animeIdxRemoved);
    						set_store_value(animeIdxRemoved, $animeIdxRemoved = removedIdx, $animeIdxRemoved);
    					}

    					val?.postMessage?.({ getEarlisetReleaseDate: true });
    				}
    			};

    			val.onerror = error => {
    				set_store_value(dataStatus, $dataStatus = "Something went wrong", $dataStatus);
    				console.error(error);
    			};

    			val?.postMessage?.({ getEarlisetReleaseDate: true });
    		}
    	});

    	window.getLastShownFinalAnimeLength = () => {
    		$$invalidate(1, animeGridEl = animeGridEl || document.getElementById("anime-grid"));
    		let popupContainerEl = document.getElementById("popup-container");
    		let lastVisiblePopup = getLastVisibleElement(".popup-content", popupContainerEl);
    		let lastVisibleGrid = getLastVisibleElement(".image-grid__card", animeGridEl);
    		let lastVisiblePopupIdx = getChildIndex(lastVisiblePopup);
    		let lastVisibleGridIdx = getChildIndex(lastVisibleGrid);

    		if (lastVisibleGridIdx == null && lastVisiblePopupIdx == null) {
    			return $finalAnimeList.length || 0;
    		} else {
    			return Math.max(lastVisiblePopupIdx ? lastVisiblePopupIdx + 1 : 0, lastVisibleGridIdx ? lastVisibleGridIdx + 1 : 0);
    		}
    	};

    	let lessenItemTimeout;

    	newFinalAnime.subscribe(async val => {
    		if (typeof val?.finalAnimeList?.id === "number" && typeof val?.idx === "number") {
    			if ($finalAnimeList instanceof Array) {
    				if ($finalAnimeList?.[val.idx] && Math.abs($finalAnimeList?.[val.idx]?.id) === val?.finalAnimeList?.id) {
    					set_store_value(finalAnimeList, $finalAnimeList[val.idx] = val.finalAnimeList, $finalAnimeList);
    				} else {
    					set_store_value(
    						finalAnimeList,
    						$finalAnimeList = $finalAnimeList?.map?.(anime => {
    							if (Math.abs(anime.id) === val?.finalAnimeList?.id) {
    								anime.id = -anime.id;
    							}

    							return anime;
    						}),
    						$finalAnimeList
    					);

    					if (val.idx < $finalAnimeList?.length) {
    						set_store_value(finalAnimeList, $finalAnimeList[val.idx] = val.finalAnimeList, $finalAnimeList);
    					} else {
    						$finalAnimeList.push(val.finalAnimeList);
    					}
    				}

    				finalAnimeList.set($finalAnimeList);
    			} else {
    				set_store_value(finalAnimeList, $finalAnimeList = [val.finalAnimeList], $finalAnimeList);
    			}

    			if (val?.idx < shownFinalAnimeListCount - 1) {
    				cancelAnimationFrame(lessenItemTimeout);

    				lessenItemTimeout = requestAnimationFrame(() => {
    					set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, window.getLastShownFinalAnimeLength() || 0), $finalAnimeList);
    				});

    				if (isRunningIntersectEvent) return;
    				set_store_value(progress, $progress = val?.idx / (shownFinalAnimeListCount - 1) * 100, $progress);
    				isRunningIntersectEvent = true;

    				requestAnimationFrame(() => {
    					if ($animeLoaderWorker instanceof Worker) {
    						$checkAnimeLoaderStatus().then(() => {
    							$animeLoaderWorker?.postMessage?.({ loadMore: true });
    						});
    					}

    					isRunningIntersectEvent = false;
    				});
    			} else {
    				set_store_value(progress, $progress = 100, $progress);
    			}
    		}
    	});

    	finalAnimeList.subscribe(async val => {
    		if (val instanceof Array && val.length) {
    			shownFinalAnimeListCount = val.length;

    			if ($shownAllInList) {
    				set_store_value(shownAllInList, $shownAllInList = false, $shownAllInList);
    			}

    			await tick();
    			addLastAnimeObserver();
    			let lastGridElementIdx = $finalAnimeList.length - 1;
    			let lastGridElement = $finalAnimeList[lastGridElementIdx].gridElement || animeGridEl.children?.[lastGridElementIdx];

    			if ($animeObserver instanceof IntersectionObserver) {
    				if ($finalAnimeList.length >= 11) {
    					let prevGridElementIdx = $finalAnimeList.length - 11;
    					let prevGridElement = $finalAnimeList[prevGridElementIdx].gridElement || animeGridEl.children?.[prevGridElementIdx];

    					if (prevGridElement instanceof Element) {
    						$animeObserver.observe(prevGridElement);
    					}
    				}

    				if (lastGridElement instanceof Element) {
    					$animeObserver.observe(lastGridElement);
    				}
    			}

    			if (isAsyncLoad) {
    				set_store_value(asyncAnimeReloaded, $asyncAnimeReloaded = !$asyncAnimeReloaded, $asyncAnimeReloaded);
    				isAsyncLoad = false;
    			}
    		} else {
    			shownFinalAnimeListCount = 0;

    			if ($animeObserver) {
    				$animeObserver?.disconnect?.();
    				set_store_value(animeObserver, $animeObserver = null, $animeObserver);
    			}

    			if (isAsyncLoad) {
    				set_store_value(asyncAnimeReloaded, $asyncAnimeReloaded = !$asyncAnimeReloaded, $asyncAnimeReloaded);
    				isAsyncLoad = false;
    			}
    		}
    	});

    	searchedAnimeKeyword.subscribe(async val => {
    		if (typeof val === "string") {
    			if ($animeLoaderWorker instanceof Worker) {
    				setLocalStorage("searchedAnimeKeyword", val).catch(() => {
    					removeLocalStorage("searchedAnimeKeyword");
    				});

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

    	let isFullViewed;
    	let lastLeftScroll, currentLeftScroll;
    	let belowGrid;
    	let afterFullGrid;
    	let isWholeGridSeen, isOnVeryLeftOfAnimeGrid = true;
    	let isOnVeryLeftOfAnimeGridTimeout;

    	window.addEventListener(
    		"scroll",
    		() => {
    			$$invalidate(6, isWholeGridSeen = isFullViewed && windowHeight > animeGridEl?.getBoundingClientRect?.()?.bottom + 10 + 57);

    			if (animeGridEl?.getBoundingClientRect?.()?.top < 0) {
    				belowGrid = true;
    			} else {
    				belowGrid = false;
    			}
    		},
    		{ passive: true }
    	);

    	let filterOptiChangeTimeout;

    	showFilterOptions.subscribe(() => {
    		clearTimeout(filterOptiChangeTimeout);

    		filterOptiChangeTimeout = setTimeout(
    			() => {
    				$$invalidate(6, isWholeGridSeen = isFullViewed && windowHeight > animeGridEl?.getBoundingClientRect?.()?.bottom + 10 + 57);
    			},
    			16
    		);
    	});

    	function goBackGrid() {
    		if (isFullViewed) {
    			$$invalidate(1, animeGridEl.style.overflow = "hidden", animeGridEl);
    			$$invalidate(1, animeGridEl.style.overflow = "", animeGridEl);
    			animeGridEl.scroll({ left: 0, behavior: "smooth" });
    		} else {
    			if ($android || !matchMedia("(hover:hover)").matches) {
    				document.documentElement.style.overflow = "hidden";
    				document.documentElement.style.overflow = "";
    			}

    			window.scrollTo({ top: -9999, behavior: "smooth" });
    		}
    	}

    	async function addImage(node, imageUrl) {
    		if (imageUrl && imageUrl !== emptyImage$1) {
    			node.src = imageUrl;
    			let newImageUrl = await cacheImage(imageUrl);

    			if (newImageUrl) {
    				node.src = newImageUrl;
    			}
    		} else {
    			node.src = emptyImage$1;
    		}
    	}

    	onMount(() => {
    		$$invalidate(0, windowHeight = Math.max(window.visualViewport.height, window.innerHeight));
    		$$invalidate(21, windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth));
    		$$invalidate(1, animeGridEl = animeGridEl || document.getElementById("anime-grid"));

    		window.addEventListener("resize", () => {
    			$$invalidate(0, windowHeight = Math.max(window.visualViewport.height, window.innerHeight));
    			$$invalidate(21, windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth));
    		});

    		let waitForOnVeryLeft;

    		animeGridEl.addEventListener("scroll", () => {
    			if (!waitForOnVeryLeft) {
    				clearTimeout(isOnVeryLeftOfAnimeGridTimeout);
    			}

    			if (isFullViewed && animeGridEl?.scrollLeft < 1) {
    				if (!waitForOnVeryLeft) {
    					waitForOnVeryLeft = true;

    					$$invalidate(22, isOnVeryLeftOfAnimeGridTimeout = setTimeout(
    						() => {
    							$$invalidate(7, isOnVeryLeftOfAnimeGrid = isFullViewed && animeGridEl?.scrollLeft < 1);
    							waitForOnVeryLeft = false;
    						},
    						8
    					));
    				}
    			} else {
    				clearTimeout(isOnVeryLeftOfAnimeGridTimeout);
    				waitForOnVeryLeft = false;
    				$$invalidate(7, isOnVeryLeftOfAnimeGrid = false);
    			}
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$6.warn(`<AnimeGrid> was created with unknown prop '${key}'`);
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
    			$$invalidate(1, animeGridEl);
    		});
    	}

    	const wheel_handler = e => {
    		if (isFullViewed && animeGridEl.scrollWidth > animeGridEl.clientWidth && Math.abs(e?.deltaY) > Math.abs(e?.deltaX)) {
    			// If its not scrolled at the very bottom of the screen and see next
    			if (!isWholeGridSeen && e?.deltaY > 0) return;

    			// If its scrolled to very left and see previous
    			if (isOnVeryLeftOfAnimeGrid && e?.deltaY < 0) return;

    			horizontalWheel$2(e, "image-grid");
    		}
    	};

    	const scroll_handler = e => {
    		let element = e?.target;
    		$$invalidate(3, lastLeftScroll = currentLeftScroll);
    		$$invalidate(4, currentLeftScroll = element?.scrollLeft);

    		if (currentLeftScroll > 500) {
    			$$invalidate(5, afterFullGrid = true);
    		} else {
    			$$invalidate(5, afterFullGrid = false);
    		}
    	};

    	const keydown_handler_1 = e => e.key === "Enter" && goBackGrid();

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		android: android$1,
    		finalAnimeList,
    		searchedAnimeKeyword,
    		animeLoaderWorker: animeLoaderWorker$1,
    		dataStatus,
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
    		mostRecentAiringDateTimeout,
    		earlisetReleaseDate,
    		showFilterOptions,
    		newFinalAnime,
    		progress,
    		filterOptions,
    		loadingFilterOptions,
    		selectedCustomFilter,
    		addClass,
    		isJsonObject,
    		removeClass,
    		getLocalStorage,
    		setLocalStorage,
    		removeLocalStorage,
    		getLastVisibleElement,
    		getChildIndex,
    		fade,
    		cacheImage,
    		emptyImage: emptyImage$1,
    		windowHeight,
    		windowWidth,
    		shownFinalAnimeListCount,
    		animeGridEl,
    		isRunningIntersectEvent,
    		numberOfLoadedGrid,
    		addLastAnimeObserver,
    		errorCountMult,
    		animeLoaderIsAlivePromise,
    		checkAnimeLoaderStatusTimeout,
    		isAsyncLoad,
    		lessenItemTimeout,
    		handleOpenPopup,
    		openOptionTimeout,
    		handleOpenOption,
    		cancelOpenOption,
    		getFinishedEpisode,
    		horizontalWheel: horizontalWheel$2,
    		isFullViewed,
    		lastLeftScroll,
    		currentLeftScroll,
    		belowGrid,
    		afterFullGrid,
    		isWholeGridSeen,
    		isOnVeryLeftOfAnimeGrid,
    		isOnVeryLeftOfAnimeGridTimeout,
    		filterOptiChangeTimeout,
    		goBackGrid,
    		addImage,
    		shouldShowGoBackInFullView,
    		$android,
    		$gridFullView,
    		$animeOptionVisible,
    		$openedAnimeOptionIdx,
    		$popupVisible,
    		$openedAnimePopupIdx,
    		$animeLoaderWorker,
    		$checkAnimeLoaderStatus,
    		$shownAllInList,
    		$asyncAnimeReloaded,
    		$animeObserver,
    		$finalAnimeList,
    		$progress,
    		$dataStatus,
    		$animeIdxRemoved,
    		$newFinalAnime,
    		$mostRecentAiringDateTimeout,
    		$earlisetReleaseDate,
    		$selectedCustomFilter,
    		$loadingFilterOptions,
    		$filterOptions,
    		$importantLoad,
    		$initData
    	});

    	$$self.$inject_state = $$props => {
    		if ('windowHeight' in $$props) $$invalidate(0, windowHeight = $$props.windowHeight);
    		if ('windowWidth' in $$props) $$invalidate(21, windowWidth = $$props.windowWidth);
    		if ('shownFinalAnimeListCount' in $$props) shownFinalAnimeListCount = $$props.shownFinalAnimeListCount;
    		if ('animeGridEl' in $$props) $$invalidate(1, animeGridEl = $$props.animeGridEl);
    		if ('isRunningIntersectEvent' in $$props) isRunningIntersectEvent = $$props.isRunningIntersectEvent;
    		if ('numberOfLoadedGrid' in $$props) $$invalidate(15, numberOfLoadedGrid = $$props.numberOfLoadedGrid);
    		if ('errorCountMult' in $$props) errorCountMult = $$props.errorCountMult;
    		if ('animeLoaderIsAlivePromise' in $$props) animeLoaderIsAlivePromise = $$props.animeLoaderIsAlivePromise;
    		if ('checkAnimeLoaderStatusTimeout' in $$props) checkAnimeLoaderStatusTimeout = $$props.checkAnimeLoaderStatusTimeout;
    		if ('isAsyncLoad' in $$props) isAsyncLoad = $$props.isAsyncLoad;
    		if ('lessenItemTimeout' in $$props) lessenItemTimeout = $$props.lessenItemTimeout;
    		if ('openOptionTimeout' in $$props) openOptionTimeout = $$props.openOptionTimeout;
    		if ('isFullViewed' in $$props) $$invalidate(2, isFullViewed = $$props.isFullViewed);
    		if ('lastLeftScroll' in $$props) $$invalidate(3, lastLeftScroll = $$props.lastLeftScroll);
    		if ('currentLeftScroll' in $$props) $$invalidate(4, currentLeftScroll = $$props.currentLeftScroll);
    		if ('belowGrid' in $$props) belowGrid = $$props.belowGrid;
    		if ('afterFullGrid' in $$props) $$invalidate(5, afterFullGrid = $$props.afterFullGrid);
    		if ('isWholeGridSeen' in $$props) $$invalidate(6, isWholeGridSeen = $$props.isWholeGridSeen);
    		if ('isOnVeryLeftOfAnimeGrid' in $$props) $$invalidate(7, isOnVeryLeftOfAnimeGrid = $$props.isOnVeryLeftOfAnimeGrid);
    		if ('isOnVeryLeftOfAnimeGridTimeout' in $$props) $$invalidate(22, isOnVeryLeftOfAnimeGridTimeout = $$props.isOnVeryLeftOfAnimeGridTimeout);
    		if ('filterOptiChangeTimeout' in $$props) filterOptiChangeTimeout = $$props.filterOptiChangeTimeout;
    		if ('shouldShowGoBackInFullView' in $$props) $$invalidate(8, shouldShowGoBackInFullView = $$props.shouldShowGoBackInFullView);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*$gridFullView, isFullViewed, windowHeight, animeGridEl, isOnVeryLeftOfAnimeGridTimeout*/ 12582919) {
    			{
    				$$invalidate(2, isFullViewed = $gridFullView ?? getLocalStorage("gridFullView") ?? false);
    				$$invalidate(6, isWholeGridSeen = isFullViewed && windowHeight > animeGridEl?.getBoundingClientRect?.()?.bottom + 10 + 57);
    				clearTimeout(isOnVeryLeftOfAnimeGridTimeout);

    				if (isFullViewed && animeGridEl?.scrollLeft < 1) {
    					$$invalidate(22, isOnVeryLeftOfAnimeGridTimeout = setTimeout(
    						() => {
    							$$invalidate(7, isOnVeryLeftOfAnimeGrid = isFullViewed && animeGridEl?.scrollLeft < 1);
    						},
    						1000
    					));
    				} else {
    					$$invalidate(7, isOnVeryLeftOfAnimeGrid = false);
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*isFullViewed, afterFullGrid, currentLeftScroll, lastLeftScroll, windowWidth*/ 2097212) {
    			$$invalidate(8, shouldShowGoBackInFullView = isFullViewed && afterFullGrid && (currentLeftScroll < lastLeftScroll || windowWidth > 596.5));
    		}
    	};

    	return [
    		windowHeight,
    		animeGridEl,
    		isFullViewed,
    		lastLeftScroll,
    		currentLeftScroll,
    		afterFullGrid,
    		isWholeGridSeen,
    		isOnVeryLeftOfAnimeGrid,
    		shouldShowGoBackInFullView,
    		$android,
    		$popupVisible,
    		$shownAllInList,
    		$finalAnimeList,
    		$earlisetReleaseDate,
    		$initData,
    		numberOfLoadedGrid,
    		handleOpenPopup,
    		handleOpenOption,
    		cancelOpenOption,
    		goBackGrid,
    		addImage,
    		windowWidth,
    		isOnVeryLeftOfAnimeGridTimeout,
    		$gridFullView,
    		load_handler,
    		error_handler,
    		pointerdown_handler,
    		keydown_handler,
    		div3_binding,
    		div_binding,
    		wheel_handler,
    		scroll_handler,
    		keydown_handler_1
    	];
    }

    class AnimeGrid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {}, null, [-1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AnimeGrid",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    let terminateDelay = 1000;
    let dataStatusPrio = false;
    let isExporting = false;
    let isCurrentlyImporting = false;
    let isGettingNewEntries = false;

    let passedFilterOptions, passedActiveTagFilters, passedSelectedCustomFilter;
    let shouldUpdateNotifications = false;

    // Reactinve Functions
    let animeLoaderWorker;
    const animeLoader$1 = (_data = {}) => {
        return new Promise((resolve, reject) => {
            if (animeLoaderWorker) {
                animeLoaderWorker?.terminate?.();
                animeLoaderWorker = null;
            }
            finalAnimeList.update((e) => e?.map?.((anime) => {
                anime.isLoading = true;
                return anime;
            })?.slice?.(
                0,
                window.getLastShownFinalAnimeLength() || 0,
            ));
            dataStatusPrio = true;
            progress.set(0);
            cacheRequest("./webapi/worker/animeLoader.js")
                .then(url => {
                    if (animeLoaderWorker) {
                        animeLoaderWorker?.terminate?.();
                        animeLoaderWorker = null;
                    }
                    if (_data?.filterOptions && _data?.activeTagFilters && _data?.selectedCustomFilter) {
                        passedFilterOptions = _data?.filterOptions;
                        passedSelectedCustomFilter = _data?.selectedCustomFilter;
                        passedActiveTagFilters = _data?.activeTagFilters;
                    } else if (passedFilterOptions && passedActiveTagFilters && passedSelectedCustomFilter) {
                        _data.filterOptions = passedFilterOptions;
                        _data.selectedCustomFilter = passedSelectedCustomFilter;
                        _data.activeTagFilters = passedActiveTagFilters;
                    }
                    animeLoaderWorker = new Worker(url);
                    _data.reloadedFilterKeyword = get_store_value(searchedAnimeKeyword) || "";
                    animeLoaderWorker.postMessage(_data);
                    animeLoaderWorker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("progress")) {
                            if (data?.progress >= 0 && data?.progress <= 100) {
                                progress.set(data.progress);
                            }
                        } else if (data?.hasOwnProperty("status")) {
                            dataStatusPrio = true;
                            dataStatus.set(data.status);
                        } else if (data?.filterOptions && typeof data?.selectedCustomFilter === "string") {
                            setLocalStorage("selectedCustomFilter", data?.selectedCustomFilter).catch(() => {
                                removeLocalStorage("selectedCustomFilter");
                            });
                            filterOptions.set(data.filterOptions);
                            loadingFilterOptions.set(false);
                        } else if (typeof data?.changedCustomFilter === "string" && data?.changedCustomFilter) {
                            selectedCustomFilter.set(data.changedCustomFilter);
                        } else if (data?.isNew) {
                            if (data?.hasPassedFilters === true) {
                                passedFilterOptions = passedSelectedCustomFilter = passedActiveTagFilters = undefined;
                            }
                            dataStatusPrio = false;
                            if (!animeLoaderWorker) return
                            animeLoaderWorker.onmessage = null;
                            listUpdateAvailable.set(false);
                            if (!data?.filterOptionsIsNotLoaded) {
                                loadingFilterOptions.set(false);
                            }
                            progress.set(100);
                            resolve(Object.assign({}, data, { animeLoaderWorker: animeLoaderWorker }));
                        }
                    };
                    animeLoaderWorker.onerror = (error) => {
                        finalAnimeList.update((e) => e?.map?.((anime) => {
                            anime.isLoading = false;
                            return anime;
                        }));
                        progress.set(100);
                        reject(error);
                    };
                })
                .catch((error) => {
                    finalAnimeList.update((e) => e?.map?.((anime) => {
                        anime.isLoading = false;
                        return anime;
                    }));
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
            if (processRecommendedAnimeListTerminateTimeout) clearTimeout(processRecommendedAnimeListTerminateTimeout);
            if (processRecommendedAnimeListWorker) {
                processRecommendedAnimeListWorker?.terminate?.();
                processRecommendedAnimeListWorker = null;
            }
            dataStatusPrio = true;
            progress.set(0);
            cacheRequest("./webapi/worker/processRecommendedAnimeList.js")
                .then(url => {
                    if (processRecommendedAnimeListTerminateTimeout) clearTimeout(processRecommendedAnimeListTerminateTimeout);
                    if (processRecommendedAnimeListWorker) {
                        processRecommendedAnimeListWorker?.terminate?.();
                        processRecommendedAnimeListWorker = null;
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
                            if (get_store_value(android$1)) {
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
                                        JSBridge?.addAnimeReleaseNotification?.(
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
                            if (shouldUpdateNotifications && get_store_value(android$1)) {
                                shouldUpdateNotifications = false;
                                try {
                                    JSBridge?.callUpdateNotifications?.();
                                } catch (e) { }
                            }
                            if (data?.hasPassedFilters === true) {
                                passedFilterOptions = passedActiveTagFilters = undefined;
                            }
                            dataStatusPrio = false;
                            processRecommendedAnimeListTerminateTimeout = setTimeout(() => {
                                processRecommendedAnimeListWorker?.terminate?.();
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
            if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout);
            if (requestAnimeEntriesWorker) {
                requestAnimeEntriesWorker?.terminate?.();
                requestAnimeEntriesWorker = null;
            }
            if (!get_store_value(initData)) {
                if (isGettingNewEntries
                    || isCurrentlyImporting
                    || isExporting
                    || get_store_value(isImporting)
                ) return
            }
            progress.set(0);
            cacheRequest("./webapi/worker/requestAnimeEntries.js")
                .then(url => {
                    if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout);
                    if (requestAnimeEntriesWorker) {
                        requestAnimeEntriesWorker?.terminate?.();
                        requestAnimeEntriesWorker = null;
                    }
                    requestAnimeEntriesWorker = new Worker(url);
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
                            if (data.getEntries) {
                                isGettingNewEntries = true;
                                stopConflictingWorkers({ isGettingNewEntries: true });
                                getAnimeEntries()
                                    .then(() => {
                                        isGettingNewEntries = false;
                                        runUpdate.update(e => !e);
                                        updateRecommendationList.update(e => !e);
                                    })
                                    .catch(() => {
                                        isGettingNewEntries = false;
                                        runUpdate.update(e => !e);
                                    });
                            }
                            requestAnimeEntriesTerminateTimeout = setTimeout(() => {
                                requestAnimeEntriesWorker?.terminate?.();
                            }, terminateDelay);
                            progress.set(100);
                            resolve(data);
                        }
                    };
                    requestAnimeEntriesWorker.onerror = (error) => {
                        isGettingNewEntries = false;
                        progress.set(100);
                        reject(error);
                    };
                }).catch((error) => {
                    isGettingNewEntries = false;
                    progress.set(100);
                    alertError();
                    reject(error);
                });
        })
    };
    let requestUserEntriesTerminateTimeout, requestUserEntriesWorker;
    const requestUserEntries = (_data) => {
        return new Promise((resolve, reject) => {
            if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout);
            if (requestUserEntriesWorker) {
                requestUserEntriesWorker?.terminate?.();
                requestUserEntriesWorker = null;
            }
            if (!get_store_value(initData)) {
                if (isExporting
                    || get_store_value(isImporting)
                    || isCurrentlyImporting
                    || isGettingNewEntries
                ) {
                    userRequestIsRunning.set(false);
                }
            }
            progress.set(0);
            cacheRequest("./webapi/worker/requestUserEntries.js")
                .then(url => {
                    if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout);
                    if (requestUserEntriesWorker) {
                        requestUserEntriesWorker?.terminate?.();
                        requestUserEntriesWorker = null;
                    }
                    requestUserEntriesWorker = new Worker(url);
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
                                        text: "User was not found, please try again.",
                                    });
                                    requestUserEntriesTerminateTimeout = setTimeout(() => {
                                        requestUserEntriesWorker?.terminate?.();
                                    }, terminateDelay);
                                    progress.set(100);
                                    reject(data);
                                }
                            }
                        } else if (data?.error) {
                            userRequestIsRunning.set(false);
                            loadAnime.update((e) => !e);
                            requestUserEntriesTerminateTimeout = setTimeout(() => {
                                requestUserEntriesWorker?.terminate?.();
                            }, terminateDelay);
                            progress.set(100);
                            reject(data);
                        } else if (data?.updateRecommendationList !== undefined) {
                            if (get_store_value(android$1)) {
                                shouldUpdateNotifications = true;
                            }
                            updateRecommendationList.update(e => !e);
                        } else {
                            userRequestIsRunning.set(false);
                            requestUserEntriesTerminateTimeout = setTimeout(() => {
                                requestUserEntriesWorker?.terminate?.();
                            }, terminateDelay);
                            progress.set(100);
                            resolve(data);
                        }
                    };
                    requestUserEntriesWorker.onerror = (error) => {
                        userRequestIsRunning.set(false);
                        loadAnime.update((e) => !e);
                        requestUserEntriesTerminateTimeout = setTimeout(() => {
                            requestUserEntriesWorker?.terminate?.();
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

    let exportUserDataWorker, waitForExportApproval;
    window.isExported = (success = true) => {
        if (success) {
            waitForExportApproval?.resolve?.();
        } else {
            waitForExportApproval?.reject?.();
        }
    };
    const exportUserData = (_data) => {
        return new Promise((resolve, reject) => {
            if (exportUserDataWorker) {
                exportUserDataWorker?.terminate?.();
                exportUserDataWorker = null;
            }
            if (!get_store_value(initData)) {
                if (get_store_value(isImporting) || isCurrentlyImporting || isGettingNewEntries) return
                isExporting = true;
                stopConflictingWorkers({ isExporting: true });
            }
            waitForExportApproval?.reject?.();
            waitForExportApproval = null;
            progress.set(0);
            cacheRequest("./webapi/worker/exportUserData.js")
                .then(url => {
                    waitForExportApproval?.reject?.();
                    waitForExportApproval = null;
                    if (exportUserDataWorker) {
                        exportUserDataWorker?.terminate?.();
                        exportUserDataWorker = null;
                    }
                    exportUserDataWorker = new Worker(url);
                    if (get_store_value(android$1)) {
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
                        } else if (get_store_value(android$1)) {
                            try {
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
                                    isExporting = false;
                                    exportUserDataWorker?.terminate?.();
                                    new Promise((resolve, reject) => {
                                        waitForExportApproval = { resolve, reject };
                                    }).catch(() => {
                                        waitForExportApproval?.reject?.();
                                    }).finally(() => {
                                        waitForExportApproval = null;
                                        progress.set(100);
                                        resolve(data);
                                    });
                                }
                            } catch (e) {
                                isExporting = false;
                                exportUserDataWorker?.terminate?.();
                                waitForExportApproval?.reject?.();
                                waitForExportApproval = null;
                                progress.set(100);
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
                        waitForExportApproval?.reject?.();
                        waitForExportApproval = null;
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Export failed",
                            text: "Data was not exported, please try again.",
                        });
                        reject(error);
                    };
                }).catch((error) => {
                    progress.set(100);
                    isExporting = false;
                    waitForExportApproval?.reject?.();
                    waitForExportApproval = null;
                    alertError();
                    reject(error);
                });
        })
    };
    let importUserDataTerminateTimeout, importUserDataWorker;
    const importUserData = (_data) => {
        return new Promise((resolve, reject) => {
            if (importUserDataTerminateTimeout) clearTimeout(importUserDataTerminateTimeout);
            if (importUserDataWorker) {
                importUserDataWorker?.terminate?.();
                importUserDataWorker = null;
            }
            if (!get_store_value(initData)) {
                if (isExporting || isGettingNewEntries) return
                isCurrentlyImporting = true;
                isImporting.set(true);
                stopConflictingWorkers({ isImporting: true });
            }
            progress.set(0);
            cacheRequest("./webapi/worker/importUserData.js")
                .then(url => {
                    if (importUserDataTerminateTimeout) clearTimeout(importUserDataTerminateTimeout);
                    if (importUserDataWorker) {
                        importUserDataWorker?.terminate?.();
                        importUserDataWorker = null;
                    }
                    importUserDataWorker = new Worker(url);
                    importUserDataWorker.postMessage(_data);
                    importUserDataWorker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("progress")) {
                            if (data?.progress >= 0 && data?.progress <= 100) {
                                progress.set(data.progress);
                            }
                        } else if (data?.error !== undefined) {
                            isImporting.set(false);
                            isCurrentlyImporting = false;
                            loadAnime.update((e) => !e);
                            window.confirmPromise?.({
                                isAlert: true,
                                title: "Import failed",
                                text: "File was not imported, please ensure that file is in a supported format (e.g., .json).",
                            });
                            progress.set(100);
                            reject(data?.error || "Something went wrong");
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
                            isCurrentlyImporting = false;
                            getFilterOptions()
                                .then((data) => {
                                    selectedCustomFilter.set(data.selectedCustomFilter);
                                    activeTagFilters.set(data.activeTagFilters);
                                    filterOptions.set(data.filterOptions);
                                });
                        } else if (data?.updateRecommendationList !== undefined) {
                            if (get_store_value(android$1)) {
                                shouldUpdateNotifications = true;
                            }
                            isImporting.set(false);
                            isCurrentlyImporting = false;
                            importantUpdate.update(e => !e);
                        } else {
                            isImporting.set(false);
                            isCurrentlyImporting = false;
                            runUpdate.update(e => !e);
                            dataStatusPrio = false;
                            importUserDataTerminateTimeout = setTimeout(() => {
                                importUserDataWorker?.terminate?.();
                            }, terminateDelay);
                            progress.set(100);
                            resolve(data);
                        }
                    };
                    importUserDataWorker.onerror = (error) => {
                        isImporting.set(false);
                        isCurrentlyImporting = false;
                        window.confirmPromise?.({
                            isAlert: true,
                            title: "Import failed",
                            text: "File was not imported, please ensure that file is in a supported format (e.g., .json).",
                        });
                        loadAnime.update((e) => !e);
                        progress.set(100);
                        reject(error || "Something went wrong");
                    };
                }).catch((error) => {
                    progress.set(100);
                    isImporting.set(false);
                    isCurrentlyImporting = false;
                    loadAnime.update((e) => !e);
                    alertError();
                    reject(error);
                });
        })
    };

    let extraInfoIndex = 1, getExtraInfoTimeout, getExtraInfoWorker;
    const getExtraInfo = () => {
        return new Promise((resolve, reject) => {
            clearTimeout(getExtraInfoTimeout);
            getExtraInfoWorker?.terminate?.();
            getExtraInfoWorker = null;
            cacheRequest("./webapi/worker/getExtraInfo.js")
                .then(url => {
                    clearTimeout(getExtraInfoTimeout);
                    getExtraInfoWorker?.terminate?.();
                    getExtraInfoWorker = null;
                    getExtraInfoWorker = new Worker(url);
                    getExtraInfoWorker.postMessage({ number: extraInfoIndex });
                    getExtraInfoWorker.onmessage = ({ data }) => {
                        if (typeof extraInfoIndex === "number" && extraInfoIndex < 6) {
                            ++extraInfoIndex;
                        } else {
                            extraInfoIndex = 1;
                        }
                        clearTimeout(getExtraInfoTimeout);
                        if (typeof data?.message === "string") {
                            extraInfo.set(data.message);
                            getExtraInfoTimeout = setTimeout(() => {
                                getExtraInfo();
                            }, 1000 * 30);
                            getExtraInfoWorker?.terminate?.();
                            resolve();
                        } else {
                            getExtraInfoWorker?.terminate?.();
                            getExtraInfo();
                        }
                    };
                    getExtraInfoWorker.onerror = (error) => {
                        reject(error);
                    };
                }).catch(() => {
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
                    worker.postMessage({ name });
                    worker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("status")) {
                            dataStatus.set(data.status);
                        } else {
                            worker?.terminate?.();
                            resolve(data);
                        }
                    };
                    worker.onerror = (error) => {
                        reject(error);
                    };
                }).catch((error) => {
                    alertError();
                    reject(error);
                });
        })
    };
    window.updateNotifications = async (aniIdsNotificationToBeUpdated = []) => {
        if (!get_store_value(android$1)) return
        new Promise((resolve, reject) => {
            cacheRequest("./webapi/worker/getIDBdata.js")
                .then(url => {
                    let worker = new Worker(url);
                    worker.postMessage({ name: "aniIdsNotificationToBeUpdated", aniIdsNotificationToBeUpdated });
                    worker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("status")) {
                            dataStatus.set(data.status);
                        } else {
                            worker?.terminate?.();
                            resolve(data);
                        }
                    };
                    worker.onerror = (error) => {
                        reject(error);
                    };
                }).catch((error) => {
                    alertError();
                    reject(error);
                });
        }).then((userAnimeAndNot = {}) => {
            try {
                for (let animeId in userAnimeAndNot) {
                    if (typeof animeId === "number" && typeof userAnimeAndNot[animeId] === "boolean") {
                        JSBridge?.updateNotifications?.(animeId, userAnimeAndNot[animeId]);
                    }
                }
            } catch (ex) { }
        });
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
                                worker?.terminate?.();
                            }, terminateDelay);
                            resolve();
                        }
                    };
                    worker.onerror = (error) => {
                        reject(error);
                    };
                    worker.postMessage({ data: _data, name: name });
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
                    if (getAnimeEntriesTerminateTimeout) clearTimeout(getAnimeEntriesTerminateTimeout);
                    let worker = new Worker(url);
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
                                worker?.terminate?.();
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
            if (getFilterOptionsTerminateTimeout) clearTimeout(getFilterOptionsTerminateTimeout);
            if (getFilterOptionsWorker) {
                getFilterOptionsWorker?.terminate?.();
                getFilterOptionsWorker = null;
            }
            getFilterOptionsInterval = setInterval(() => {
                if (!gettingAnimeEntriesInterval) {
                    dataStatus.set("Getting Filters");
                }
            }, 300);
            cacheRequest("./webapi/worker/getFilterOptions.js")
                .then(url => {
                    if (getFilterOptionsTerminateTimeout) clearTimeout(getFilterOptionsTerminateTimeout);
                    if (getFilterOptionsWorker) {
                        getFilterOptionsWorker?.terminate?.();
                        getFilterOptionsWorker = null;
                    }
                    if (getFilterOptionsInterval) {
                        clearInterval(getFilterOptionsInterval);
                        getFilterOptionsInterval = null;
                    }
                    getFilterOptionsWorker = new Worker(url);
                    getFilterOptionsWorker.postMessage(_data);
                    getFilterOptionsWorker.onmessage = ({ data }) => {
                        if (data?.hasOwnProperty("status")) {
                            dataStatusPrio = true;
                            dataStatus.set(data.status);
                        } else {
                            dataStatusPrio = false;
                            getFilterOptionsTerminateTimeout = setTimeout(() => {
                                getFilterOptionsWorker?.terminate?.();
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

    function stopConflictingWorkers(blocker) {
        progress.set(0);
        requestAnimeEntriesWorker?.terminate?.();
        isGettingNewEntries = blocker?.isGettingNewEntries ?? false;
        requestUserEntriesWorker?.terminate?.();
        userRequestIsRunning.set(false);
        importUserDataWorker?.terminate?.();
        isImporting.set(blocker?.isImporting ?? false);
        isCurrentlyImporting = blocker?.isImporting ?? false;
        exportUserDataWorker?.terminate?.();
        isExporting = blocker?.isExporting ?? false;
        getFilterOptionsWorker?.terminate?.();
        clearInterval(gettingAnimeEntriesInterval);
        gettingAnimeEntriesInterval = null;
        clearInterval(getFilterOptionsInterval);
        getFilterOptionsInterval = null;
        dataStatus.set(null);
    }

    function alertError() {
        if (get_store_value(android$1)) {
            window.confirmPromise?.({
                isAlert: true,
                title: "Something went wrong",
                text: "App may not be working properly, you may want to restart and make sure you're running the latest version.",
            });
        } else {
            window.confirmPromise?.({
                isAlert: true,
                title: "Something went wrong",
                text: "App may not be working properly, you may want to refresh the page, or if not clear your cookies but backup your data first.",
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

    const { console: console_1$5 } = globals;
    const file$7 = "src\\components\\Anime\\Fixed\\AnimePopup.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[121] = list[i];
    	child_ctx[122] = list;
    	child_ctx[123] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[124] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[127] = list[i];
    	return child_ctx;
    }

    function get_each_context_3$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[130] = list[i];
    	return child_ctx;
    }

    // (1381:8) {#if $finalAnimeList?.length}
    function create_if_block_3$2(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t;
    	let if_block_anchor;
    	let each_value = /*$finalAnimeList*/ ctx[10] || [];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*anime*/ ctx[121]?.id || {};
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	let if_block = /*$finalAnimeList*/ ctx[10]?.length && !/*$shownAllInList*/ ctx[16] && create_if_block_4$1(ctx);

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
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList, $popupIsGoingBack, handleMoreVideos, handleHideShow, $hiddenEntries, windowWidth, windowHeight, fullImagePopup, fullDescriptionPopup, itemScroll, itemIsScrolling, $earlisetReleaseDate, getFormattedAnimeFormat, updateList, $listIsUpdating, $listUpdateAvailable, $autoPlay, askToOpenYoutube*/ 24968627 | dirty[1] & /*showFullScreenInfo*/ 4) {
    				each_value = /*$finalAnimeList*/ ctx[10] || [];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, t.parentNode, destroy_block, create_each_block$2, t, get_each_context$2);
    			}

    			if (/*$finalAnimeList*/ ctx[10]?.length && !/*$shownAllInList*/ ctx[16]) {
    				if (if_block) ; else {
    					if_block = create_if_block_4$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
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
    		source: "(1381:8) {#if $finalAnimeList?.length}",
    		ctx
    	});

    	return block;
    }

    // (1404:28) {#if anime.trailerID}
    function create_if_block_18$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "trailer display-none svelte-ofh824");
    			add_location(div, file$7, 1404, 32, 54653);
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
    		id: create_if_block_18$1.name,
    		type: "if",
    		source: "(1404:28) {#if anime.trailerID}",
    		ctx
    	});

    	return block;
    }

    // (1408:32) {#if anime.bannerImageUrl || anime.trailerThumbnailUrl}
    function create_if_block_17$1(ctx) {
    	let img;
    	let img_alt_value;
    	let addImage_action;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "loading", "lazy");
    			attr_dev(img, "width", "640px");
    			attr_dev(img, "height", "360px");

    			attr_dev(img, "alt", img_alt_value = (/*anime*/ ctx[121]?.shownTitle || "") + (/*anime*/ ctx[121].bannerImageUrl
    			? " Banner"
    			: " Thumbnail"));

    			attr_dev(img, "class", "bannerImg fade-out svelte-ofh824");
    			add_location(img, file$7, 1408, 36, 54904);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(addImage_action = /*addImage*/ ctx[34].call(null, img, /*anime*/ ctx[121].bannerImageUrl || /*anime*/ ctx[121].trailerThumbnailUrl || emptyImage)),
    					listen_dev(img, "load", /*load_handler*/ ctx[36], false, false, false, false),
    					listen_dev(img, "error", /*error_handler*/ ctx[37], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && img_alt_value !== (img_alt_value = (/*anime*/ ctx[121]?.shownTitle || "") + (/*anime*/ ctx[121].bannerImageUrl
    			? " Banner"
    			: " Thumbnail"))) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (addImage_action && is_function(addImage_action.update) && dirty[0] & /*$finalAnimeList*/ 1024) addImage_action.update.call(null, /*anime*/ ctx[121].bannerImageUrl || /*anime*/ ctx[121].trailerThumbnailUrl || emptyImage);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_17$1.name,
    		type: "if",
    		source: "(1408:32) {#if anime.bannerImageUrl || anime.trailerThumbnailUrl}",
    		ctx
    	});

    	return block;
    }

    // (1472:65) 
    function create_if_block_16$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Auto");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16$1.name,
    		type: "if",
    		source: "(1472:65) ",
    		ctx
    	});

    	return block;
    }

    // (1470:36) {#if windowWidth >= 290}
    function create_if_block_15$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Auto Play");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15$1.name,
    		type: "if",
    		source: "(1470:36) {#if windowWidth >= 290}",
    		ctx
    	});

    	return block;
    }

    // (1477:28) {#if $listUpdateAvailable}
    function create_if_block_14$1(ctx) {
    	let div;
    	let svg;
    	let path;
    	let svg_class_value;
    	let t0;
    	let h3;

    	let t1_value = (/*windowWidth*/ ctx[4] >= 320
    	? "List Update"
    	: /*windowWidth*/ ctx[4] >= 205
    		? "Update"
    		: /*windowWidth*/ ctx[4] >= 180 ? "List" : "") + "";

    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			h3 = element("h3");
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M105 203a160 160 0 0 1 264-60l17 17h-50a32 32 0 1 0 0 64h128c18 0 32-14 32-32V64a32 32 0 1 0-64 0v51l-18-17a224 224 0 0 0-369 83 32 32 0 0 0 60 22zm-66 86a32 32 0 0 0-23 31v128a32 32 0 1 0 64 0v-51l18 17a224 224 0 0 0 369-83 32 32 0 0 0-60-22 160 160 0 0 1-264 60l-17-17h50a32 32 0 1 0 0-64H48a39 39 0 0 0-9 1z");
    			add_location(path, file$7, 1491, 40, 59655);
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "class", svg_class_value = "" + (null_to_empty("list-update-icon" + (/*$listIsUpdating*/ ctx[14] ? " spin" : "")) + " svelte-ofh824"));
    			add_location(svg, file$7, 1486, 36, 59359);
    			attr_dev(h3, "class", "list-update-label svelte-ofh824");
    			add_location(h3, file$7, 1495, 36, 60146);
    			attr_dev(div, "class", "list-update-container svelte-ofh824");
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file$7, 1478, 32, 58913);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);
    			append_dev(div, t0);
    			append_dev(div, h3);
    			append_dev(h3, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*updateList*/ ctx[21], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_3*/ ctx[45], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$listIsUpdating*/ 16384 && svg_class_value !== (svg_class_value = "" + (null_to_empty("list-update-icon" + (/*$listIsUpdating*/ ctx[14] ? " spin" : "")) + " svelte-ofh824"))) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (dirty[0] & /*windowWidth*/ 16 && t1_value !== (t1_value = (/*windowWidth*/ ctx[4] >= 320
    			? "List Update"
    			: /*windowWidth*/ ctx[4] >= 205
    				? "Update"
    				: /*windowWidth*/ ctx[4] >= 180 ? "List" : "") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14$1.name,
    		type: "if",
    		source: "(1477:28) {#if $listUpdateAvailable}",
    		ctx
    	});

    	return block;
    }

    // (1507:28) {#if anime.bannerImageUrl || anime.trailerThumbnailUrl}
    function create_if_block_13$1(ctx) {
    	let div;
    	let svg;
    	let path;
    	let t0;
    	let h3;

    	let t1_value = (/*anime*/ ctx[121].bannerImageUrl
    	? "Banner"
    	: "Thumbnail") + "";

    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[46](/*anime*/ ctx[121]);
    	}

    	function keydown_handler_4(...args) {
    		return /*keydown_handler_4*/ ctx[47](/*anime*/ ctx[121], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			h3 = element("h3");
    			t1 = text(t1_value);
    			attr_dev(path, "d", "M0 96c0-35 29-64 64-64h384c35 0 64 29 64 64v320c0 35-29 64-64 64H64c-35 0-64-29-64-64V96zm324 107a24 24 0 0 0-40 0l-87 127-26-33a24 24 0 0 0-37 0l-65 80a24 24 0 0 0 19 39h336c9 0 17-5 21-13s4-17-1-25L324 204zm-212-11a48 48 0 1 0 0-96 48 48 0 1 0 0 96z");
    			add_location(path, file$7, 1533, 40, 62396);
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "class", "banner-image-icon svelte-ofh824");
    			add_location(svg, file$7, 1529, 36, 62181);
    			attr_dev(h3, "class", "banner-image-label svelte-ofh824");
    			add_location(h3, file$7, 1537, 36, 62828);
    			attr_dev(div, "class", "banner-image-button svelte-ofh824");
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file$7, 1508, 32, 60928);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);
    			append_dev(div, t0);
    			append_dev(div, h3);
    			append_dev(h3, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", click_handler_2, false, false, false, false),
    					listen_dev(div, "keydown", keydown_handler_4, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t1_value !== (t1_value = (/*anime*/ ctx[121].bannerImageUrl
    			? "Banner"
    			: "Thumbnail") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13$1.name,
    		type: "if",
    		source: "(1507:28) {#if anime.bannerImageUrl || anime.trailerThumbnailUrl}",
    		ctx
    	});

    	return block;
    }

    // (1632:36) {:else}
    function create_else_block_2$1(ctx) {
    	let h4;
    	let t0_value = (/*anime*/ ctx[121]?.format || "NA") + "";
    	let t0;
    	let t1;
    	let html_tag;
    	let raw_value = (/*getFormattedAnimeFormat*/ ctx[22](/*anime*/ ctx[121]) || " · NA") + "";
    	let t2;
    	let t3_value = (/*anime*/ ctx[121]?.formattedDuration || " · NA") + "";
    	let t3;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			t0 = text(t0_value);
    			t1 = space();
    			html_tag = new HtmlTag(false);
    			t2 = space();
    			t3 = text(t3_value);
    			html_tag.a = t2;
    			attr_dev(h4, "class", "svelte-ofh824");
    			add_location(h4, file$7, 1632, 40, 68799);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, t0);
    			append_dev(h4, t1);
    			html_tag.m(raw_value, h4);
    			append_dev(h4, t2);
    			append_dev(h4, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t0_value !== (t0_value = (/*anime*/ ctx[121]?.format || "NA") + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && raw_value !== (raw_value = (/*getFormattedAnimeFormat*/ ctx[22](/*anime*/ ctx[121]) || " · NA") + "")) html_tag.p(raw_value);
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t3_value !== (t3_value = (/*anime*/ ctx[121]?.formattedDuration || " · NA") + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2$1.name,
    		type: "else",
    		source: "(1632:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1621:36) {#if anime?.nextAiringEpisode?.airingAt}
    function create_if_block_12$1(ctx) {
    	let h4;
    	let t0_value = (/*anime*/ ctx[121]?.format || "NA") + "";
    	let t0;
    	let t1;
    	let previous_key = /*$earlisetReleaseDate*/ ctx[15] || 1;
    	let t2;
    	let t3_value = (/*anime*/ ctx[121]?.formattedDuration || " · NA") + "";
    	let t3;
    	let key_block = create_key_block(ctx);

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			t0 = text(t0_value);
    			t1 = space();
    			key_block.c();
    			t2 = space();
    			t3 = text(t3_value);
    			attr_dev(h4, "class", "svelte-ofh824");
    			add_location(h4, file$7, 1621, 40, 68126);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, t0);
    			append_dev(h4, t1);
    			key_block.m(h4, null);
    			append_dev(h4, t2);
    			append_dev(h4, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t0_value !== (t0_value = (/*anime*/ ctx[121]?.format || "NA") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$earlisetReleaseDate*/ 32768 && safe_not_equal(previous_key, previous_key = /*$earlisetReleaseDate*/ ctx[15] || 1)) {
    				key_block.d(1);
    				key_block = create_key_block(ctx);
    				key_block.c();
    				key_block.m(h4, t2);
    			} else {
    				key_block.p(ctx, dirty);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t3_value !== (t3_value = (/*anime*/ ctx[121]?.formattedDuration || " · NA") + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    			key_block.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12$1.name,
    		type: "if",
    		source: "(1621:36) {#if anime?.nextAiringEpisode?.airingAt}",
    		ctx
    	});

    	return block;
    }

    // (1624:44) {#key $earlisetReleaseDate || 1}
    function create_key_block(ctx) {
    	let html_tag;
    	let raw_value = (/*getFormattedAnimeFormat*/ ctx[22](/*anime*/ ctx[121]) || " · NA") + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && raw_value !== (raw_value = (/*getFormattedAnimeFormat*/ ctx[22](/*anime*/ ctx[121]) || " · NA") + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block.name,
    		type: "key",
    		source: "(1624:44) {#key $earlisetReleaseDate || 1}",
    		ctx
    	});

    	return block;
    }

    // (1660:36) {:else}
    function create_else_block_1$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "NA";
    			set_style(span, "text-align", "right");
    			attr_dev(span, "class", "svelte-ofh824");
    			add_location(span, file$7, 1660, 40, 70525);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(1660:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1642:36) {#if anime?.season || anime?.year}
    function create_if_block_11$1(ctx) {
    	let span;

    	let t_value = (`${/*anime*/ ctx[121]?.season || ""}${/*anime*/ ctx[121]?.season && /*anime*/ ctx[121]?.year
	? " " + /*anime*/ ctx[121]?.year
	: /*anime*/ ctx[121]?.year || ""}` || "NA") + "";

    	let t;
    	let span_copy_value_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			set_style(span, "text-align", "right");
    			attr_dev(span, "class", "copy svelte-ofh824");

    			attr_dev(span, "copy-value", span_copy_value_value = `${/*anime*/ ctx[121]?.season || ""}${/*anime*/ ctx[121]?.season && /*anime*/ ctx[121]?.year
			? " " + /*anime*/ ctx[121]?.year
			: /*anime*/ ctx[121]?.year || ""}` || "");

    			add_location(span, file$7, 1642, 40, 69400);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t_value !== (t_value = (`${/*anime*/ ctx[121]?.season || ""}${/*anime*/ ctx[121]?.season && /*anime*/ ctx[121]?.year
			? " " + /*anime*/ ctx[121]?.year
			: /*anime*/ ctx[121]?.year || ""}` || "NA") + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_copy_value_value !== (span_copy_value_value = `${/*anime*/ ctx[121]?.season || ""}${/*anime*/ ctx[121]?.season && /*anime*/ ctx[121]?.year
			? " " + /*anime*/ ctx[121]?.year
			: /*anime*/ ctx[121]?.year || ""}` || "")) {
    				attr_dev(span, "copy-value", span_copy_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11$1.name,
    		type: "if",
    		source: "(1642:36) {#if anime?.season || anime?.year}",
    		ctx
    	});

    	return block;
    }

    // (1695:44) {#if anime.userScore != null}
    function create_if_block_10$1(ctx) {
    	let t0_value = " · " + "";
    	let t0;
    	let t1;
    	let svg;
    	let path;
    	let t2;
    	let t3_value = /*anime*/ ctx[121].userScore + "";
    	let t3;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t2 = space();
    			t3 = text(t3_value);
    			attr_dev(path, "d", "M288 0c9 0 17 5 21 14l69 141 153 22c9 2 17 8 20 17s0 18-6 24L434 328l26 156c1 9-2 18-10 24s-17 6-25 1l-137-73-137 73c-8 4-18 4-25-2s-11-14-10-23l26-156L31 218a24 24 0 0 1 14-41l153-22 68-141c4-9 13-14 22-14zm0 79-53 108c-3 7-10 12-18 13L99 219l86 85c5 6 8 13 7 21l-21 120 106-57c7-3 15-3 22 1l105 56-20-120c-1-8 1-15 7-21l86-85-118-17c-8-2-15-7-18-14L288 79z");
    			add_location(path, file$7, 1698, 53, 72787);
    			attr_dev(svg, "viewBox", "0 0 576 512");
    			attr_dev(svg, "class", "svelte-ofh824");
    			add_location(svg, file$7, 1697, 48, 72706);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, t3, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t3_value !== (t3_value = /*anime*/ ctx[121].userScore + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(svg);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(t3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10$1.name,
    		type: "if",
    		source: "(1695:44) {#if anime.userScore != null}",
    		ctx
    	});

    	return block;
    }

    // (1716:36) {#if anime?.shownStudios?.length}
    function create_if_block_9$1(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_3 = /*anime*/ ctx[121].shownStudios;
    	validate_each_argument(each_value_3);
    	const get_key = ctx => /*studios*/ ctx[130]?.studio || {};
    	validate_each_keys(ctx, each_value_3, get_each_context_3$1, get_key);

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		let child_ctx = get_each_context_3$1(ctx, each_value_3, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_3$1(key, child_ctx));
    	}

    	function mouseenter_handler(...args) {
    		return /*mouseenter_handler*/ ctx[48](/*anime*/ ctx[121], /*each_value*/ ctx[122], /*anime_index*/ ctx[123], ...args);
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

    			attr_dev(div0, "class", "info-categ svelte-ofh824");
    			add_location(div0, file$7, 1717, 44, 74190);
    			attr_dev(div1, "class", "" + (null_to_empty("studio-popup info") + " svelte-ofh824"));
    			set_style(div1, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div1, file$7, 1720, 44, 74369);
    			attr_dev(div2, "class", "svelte-ofh824");
    			add_location(div2, file$7, 1716, 40, 74139);
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
    				dispose = [
    					listen_dev(div1, "scroll", /*itemScroll*/ ctx[24], false, false, false, false),
    					listen_dev(div1, "mouseenter", mouseenter_handler, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 1024) {
    				each_value_3 = /*anime*/ ctx[121].shownStudios;
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
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9$1.name,
    		type: "if",
    		source: "(1716:36) {#if anime?.shownStudios?.length}",
    		ctx
    	});

    	return block;
    }

    // (1745:48) {#each anime.shownStudios as studios (studios?.studio || {}
    function create_each_block_3$1(key_1, ctx) {
    	let a;
    	let t0_value = (/*studios*/ ctx[130]?.studio?.studioName || "N/A") + "";
    	let t0;
    	let t1;
    	let a_class_value;
    	let a_rel_value;
    	let a_target_value;
    	let a_href_value;
    	let a_copy_value_value;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();

    			attr_dev(a, "class", a_class_value = "" + (null_to_empty("copy" + ((/*studios*/ ctx[130]?.studioColor)
    			? ` ${/*studios*/ ctx[130]?.studioColor}-color`
    			: "")) + " svelte-ofh824"));

    			attr_dev(a, "rel", a_rel_value = (/*studios*/ ctx[130]?.studio?.studioUrl)
    			? "noopener noreferrer"
    			: "");

    			attr_dev(a, "target", a_target_value = (/*studios*/ ctx[130]?.studio?.studioUrl)
    			? "_blank"
    			: "");

    			attr_dev(a, "href", a_href_value = /*studios*/ ctx[130]?.studio?.studioUrl || "javascript:void(0)");
    			attr_dev(a, "copy-value", a_copy_value_value = /*studios*/ ctx[130]?.studio?.studioName || "");
    			add_location(a, file$7, 1745, 52, 76123);
    			this.first = a;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t0_value !== (t0_value = (/*studios*/ ctx[130]?.studio?.studioName || "N/A") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a_class_value !== (a_class_value = "" + (null_to_empty("copy" + ((/*studios*/ ctx[130]?.studioColor)
    			? ` ${/*studios*/ ctx[130]?.studioColor}-color`
    			: "")) + " svelte-ofh824"))) {
    				attr_dev(a, "class", a_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a_rel_value !== (a_rel_value = (/*studios*/ ctx[130]?.studio?.studioUrl)
    			? "noopener noreferrer"
    			: "")) {
    				attr_dev(a, "rel", a_rel_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a_target_value !== (a_target_value = (/*studios*/ ctx[130]?.studio?.studioUrl)
    			? "_blank"
    			: "")) {
    				attr_dev(a, "target", a_target_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a_href_value !== (a_href_value = /*studios*/ ctx[130]?.studio?.studioUrl || "javascript:void(0)")) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a_copy_value_value !== (a_copy_value_value = /*studios*/ ctx[130]?.studio?.studioName || "")) {
    				attr_dev(a, "copy-value", a_copy_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3$1.name,
    		type: "each",
    		source: "(1745:48) {#each anime.shownStudios as studios (studios?.studio || {}",
    		ctx
    	});

    	return block;
    }

    // (1774:36) {#if anime?.shownGenres?.length}
    function create_if_block_8$1(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_2 = /*anime*/ ctx[121].shownGenres;
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*genres*/ ctx[127]?.genre || {};
    	validate_each_keys(ctx, each_value_2, get_each_context_2$1, get_key);

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2$1(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_2$1(key, child_ctx));
    	}

    	function mouseenter_handler_1(...args) {
    		return /*mouseenter_handler_1*/ ctx[49](/*anime*/ ctx[121], /*each_value*/ ctx[122], /*anime_index*/ ctx[123], ...args);
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

    			attr_dev(div0, "class", "info-categ svelte-ofh824");
    			add_location(div0, file$7, 1775, 44, 78210);
    			attr_dev(div1, "class", "" + (null_to_empty("genres-popup info") + " svelte-ofh824"));
    			set_style(div1, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div1, file$7, 1776, 44, 78292);
    			attr_dev(div2, "class", "svelte-ofh824");
    			add_location(div2, file$7, 1774, 40, 78159);
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
    				dispose = [
    					listen_dev(div1, "scroll", /*itemScroll*/ ctx[24], false, false, false, false),
    					listen_dev(div1, "mouseenter", mouseenter_handler_1, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 1024) {
    				each_value_2 = /*anime*/ ctx[121].shownGenres;
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
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8$1.name,
    		type: "if",
    		source: "(1774:36) {#if anime?.shownGenres?.length}",
    		ctx
    	});

    	return block;
    }

    // (1801:48) {#each anime.shownGenres as genres (genres?.genre || {}
    function create_each_block_2$1(key_1, ctx) {
    	let span;
    	let t0_value = (/*genres*/ ctx[127]?.genre || "N/A") + "";
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

    			attr_dev(span, "class", span_class_value = "" + (null_to_empty("copy " + ((/*genres*/ ctx[127]?.genreColor)
    			? `${/*genres*/ ctx[127]?.genreColor}-color`
    			: "")) + " svelte-ofh824"));

    			attr_dev(span, "copy-value", span_copy_value_value = /*genres*/ ctx[127]?.genre || "");
    			add_location(span, file$7, 1801, 52, 80040);
    			this.first = span;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t0_value !== (t0_value = (/*genres*/ ctx[127]?.genre || "N/A") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_class_value !== (span_class_value = "" + (null_to_empty("copy " + ((/*genres*/ ctx[127]?.genreColor)
    			? `${/*genres*/ ctx[127]?.genreColor}-color`
    			: "")) + " svelte-ofh824"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_copy_value_value !== (span_copy_value_value = /*genres*/ ctx[127]?.genre || "")) {
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
    		source: "(1801:48) {#each anime.shownGenres as genres (genres?.genre || {}",
    		ctx
    	});

    	return block;
    }

    // (1816:36) {#if anime?.shownTags?.length}
    function create_if_block_7$1(ctx) {
    	let div1;
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_1 = /*anime*/ ctx[121].shownTags;
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*tags*/ ctx[124]?.tag || {};
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
    	}

    	function mouseenter_handler_2(...args) {
    		return /*mouseenter_handler_2*/ ctx[52](/*anime*/ ctx[121], /*each_value*/ ctx[122], /*anime_index*/ ctx[123], ...args);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "" + (null_to_empty("tags-info-content info") + " svelte-ofh824"));
    			set_style(div0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div0, file$7, 1817, 44, 81103);
    			attr_dev(div1, "class", "tag-info svelte-ofh824");
    			add_location(div1, file$7, 1816, 40, 81035);
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
    				dispose = [
    					listen_dev(div0, "scroll", /*itemScroll*/ ctx[24], false, false, false, false),
    					listen_dev(div0, "mouseenter", mouseenter_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList, itemIsScrolling*/ 1152 | dirty[1] & /*showFullScreenInfo*/ 4) {
    				each_value_1 = /*anime*/ ctx[121].shownTags;
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
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7$1.name,
    		type: "if",
    		source: "(1816:36) {#if anime?.shownTags?.length}",
    		ctx
    	});

    	return block;
    }

    // (1842:48) {#each anime.shownTags as tags (tags?.tag || {}
    function create_each_block_1$1(key_1, ctx) {
    	let span;
    	let html_tag;
    	let raw_value = (/*tags*/ ctx[124]?.tag || "N/A") + "";
    	let t;
    	let span_class_value;
    	let span_copy_value_value;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[50](/*tags*/ ctx[124]);
    	}

    	function keydown_handler_5(...args) {
    		return /*keydown_handler_5*/ ctx[51](/*tags*/ ctx[124], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			span = element("span");
    			html_tag = new HtmlTag(false);
    			t = space();
    			html_tag.a = t;

    			attr_dev(span, "class", span_class_value = "" + (null_to_empty("copy " + ((/*tags*/ ctx[124]?.tagColor)
    			? `${/*tags*/ ctx[124]?.tagColor}-color`
    			: "")) + " svelte-ofh824"));

    			attr_dev(span, "copy-value", span_copy_value_value = /*tags*/ ctx[124]?.copyValue || "");
    			add_location(span, file$7, 1842, 52, 82844);
    			this.first = span;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			html_tag.m(raw_value, span);
    			append_dev(span, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(span, "click", click_handler_3, false, false, false, false),
    					listen_dev(span, "keydown", keydown_handler_5, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && raw_value !== (raw_value = (/*tags*/ ctx[124]?.tag || "N/A") + "")) html_tag.p(raw_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_class_value !== (span_class_value = "" + (null_to_empty("copy " + ((/*tags*/ ctx[124]?.tagColor)
    			? `${/*tags*/ ctx[124]?.tagColor}-color`
    			: "")) + " svelte-ofh824"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span_copy_value_value !== (span_copy_value_value = /*tags*/ ctx[124]?.copyValue || "")) {
    				attr_dev(span, "copy-value", span_copy_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(1842:48) {#each anime.shownTags as tags (tags?.tag || {}",
    		ctx
    	});

    	return block;
    }

    // (1933:36) {#if anime?.description}
    function create_if_block_6$1(ctx) {
    	let div1;
    	let h3;
    	let t1;
    	let div0;
    	let raw_value = editHTMLString(/*anime*/ ctx[121]?.description) + "";
    	let mounted;
    	let dispose;

    	function click_handler_5() {
    		return /*click_handler_5*/ ctx[56](/*anime*/ ctx[121]);
    	}

    	function keydown_handler_7(...args) {
    		return /*keydown_handler_7*/ ctx[57](/*anime*/ ctx[121], ...args);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Description";
    			t1 = space();
    			div0 = element("div");
    			attr_dev(h3, "class", "svelte-ofh824");
    			add_location(h3, file$7, 1947, 44, 89961);
    			attr_dev(div0, "class", "anime-description svelte-ofh824");
    			add_location(div0, file$7, 1948, 44, 90027);
    			attr_dev(div1, "class", "anime-description-wrapper svelte-ofh824");
    			attr_dev(div1, "tabindex", "0");
    			add_location(div1, file$7, 1934, 40, 89148);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h3);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			div0.innerHTML = raw_value;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "click", click_handler_5, false, false, false, false),
    					listen_dev(div1, "keydown", keydown_handler_7, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 1024 && raw_value !== (raw_value = editHTMLString(/*anime*/ ctx[121]?.description) + "")) div0.innerHTML = raw_value;		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6$1.name,
    		type: "if",
    		source: "(1933:36) {#if anime?.description}",
    		ctx
    	});

    	return block;
    }

    // (1986:36) {:else}
    function create_else_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Loading...");
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
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(1986:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1981:36) {#if $hiddenEntries}
    function create_if_block_5$1(ctx) {
    	let t_value = " " + (/*$hiddenEntries*/ ctx[12][/*anime*/ ctx[121]?.id]
    	? "Show"
    	: "Hide") + "";

    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$hiddenEntries, $finalAnimeList*/ 5120 && t_value !== (t_value = " " + (/*$hiddenEntries*/ ctx[12][/*anime*/ ctx[121]?.id]
    			? "Show"
    			: "Hide") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(1981:36) {#if $hiddenEntries}",
    		ctx
    	});

    	return block;
    }

    // (1382:12) {#each $finalAnimeList || [] as anime (anime?.id || {}
    function create_each_block$2(key_1, ctx) {
    	let div15;
    	let div14;
    	let div2;
    	let div0;
    	let svg0;
    	let path0;
    	let t0;
    	let t1;
    	let div1;
    	let div2_class_value;
    	let each_value = /*each_value*/ ctx[122];
    	let anime_index = /*anime_index*/ ctx[123];
    	let t2;
    	let div4;
    	let div3;
    	let label1;
    	let label0;
    	let t3;
    	let label0_for_value;
    	let t4;
    	let input;
    	let input_id_value;
    	let t5;
    	let span0;
    	let t6;
    	let h30;
    	let t7;
    	let t8;
    	let t9;
    	let div13;
    	let div11;
    	let div6;
    	let a0;
    	let t10_value = (/*anime*/ ctx[121]?.shownTitle || "NA") + "";
    	let t10;
    	let a0_rel_value;
    	let a0_target_value;
    	let a0_href_value;
    	let a0_class_value;
    	let a0_copy_value_value;
    	let a0_copy_value___value;
    	let t11;
    	let div5;
    	let svg1;
    	let path1;
    	let t12;
    	let h31;
    	let b;

    	let t13_value = (/*anime*/ ctx[121].averageScore != null
    	? /*anime*/ ctx[121].formattedAverageScore || "NA"
    	: "NA") + "";

    	let t13;
    	let t14;

    	let t15_value = "/10 · " + (/*anime*/ ctx[121].popularity != null
    	? /*anime*/ ctx[121].formattedPopularity || "NA"
    	: "NA") + "";

    	let t15;
    	let t16;
    	let t17_value = " · " + "";
    	let t17;
    	let html_tag;
    	let raw_value = (/*anime*/ ctx[121]?.recommendedRatingInfo || "") + "";
    	let h31_copy_value_value;
    	let t18;
    	let div7;
    	let t19;
    	let t20;
    	let div8;
    	let h40;
    	let a1;
    	let span1;
    	let t21_value = (/*anime*/ ctx[121].userStatus || "NA") + "";
    	let t21;
    	let span1_class_value;
    	let t22;
    	let a1_rel_value;
    	let a1_target_value;
    	let a1_href_value;
    	let h40_copy_value_value;
    	let t23;
    	let h41;
    	let t24_value = (/*anime*/ ctx[121].status || "NA") + "";
    	let t24;
    	let h41_copy_value_value;
    	let t25;
    	let div9;
    	let t26;
    	let t27;
    	let t28;
    	let div10;
    	let img;
    	let img_alt_value;
    	let img_class_value;
    	let addImage_action;
    	let t29;
    	let t30;
    	let div12;
    	let button0;
    	let svg2;
    	let path2;
    	let t31;
    	let t32;
    	let button1;
    	let svg3;
    	let path3;
    	let t33;
    	let t34;
    	let button2;
    	let svg4;
    	let path4;
    	let path5;
    	let t35;
    	let mounted;
    	let dispose;
    	let if_block0 = /*anime*/ ctx[121].trailerID && create_if_block_18$1(ctx);
    	let if_block1 = (/*anime*/ ctx[121].bannerImageUrl || /*anime*/ ctx[121].trailerThumbnailUrl) && create_if_block_17$1(ctx);
    	const assign_div2 = () => /*div2_binding*/ ctx[38](div2, each_value, anime_index);
    	const unassign_div2 = () => /*div2_binding*/ ctx[38](null, each_value, anime_index);

    	function click_handler() {
    		return /*click_handler*/ ctx[39](/*anime*/ ctx[121]);
    	}

    	function keydown_handler(...args) {
    		return /*keydown_handler*/ ctx[40](/*anime*/ ctx[121], ...args);
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*windowWidth*/ ctx[4] >= 290) return create_if_block_15$1;
    		if (/*windowWidth*/ ctx[4] >= 260) return create_if_block_16$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block2 = current_block_type && current_block_type(ctx);
    	let if_block3 = /*$listUpdateAvailable*/ ctx[13] && create_if_block_14$1(ctx);
    	let if_block4 = (/*anime*/ ctx[121].bannerImageUrl || /*anime*/ ctx[121].trailerThumbnailUrl) && create_if_block_13$1(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*anime*/ ctx[121]?.nextAiringEpisode?.airingAt) return create_if_block_12$1;
    		return create_else_block_2$1;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block5 = current_block_type_1(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*anime*/ ctx[121]?.season || /*anime*/ ctx[121]?.year) return create_if_block_11$1;
    		return create_else_block_1$1;
    	}

    	let current_block_type_2 = select_block_type_2(ctx);
    	let if_block6 = current_block_type_2(ctx);
    	let if_block7 = /*anime*/ ctx[121].userScore != null && create_if_block_10$1(ctx);
    	let if_block8 = /*anime*/ ctx[121]?.shownStudios?.length && create_if_block_9$1(ctx);
    	let if_block9 = /*anime*/ ctx[121]?.shownGenres?.length && create_if_block_8$1(ctx);
    	let if_block10 = /*anime*/ ctx[121]?.shownTags?.length && create_if_block_7$1(ctx);

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[54](/*anime*/ ctx[121]);
    	}

    	function keydown_handler_6(...args) {
    		return /*keydown_handler_6*/ ctx[55](/*anime*/ ctx[121], ...args);
    	}

    	let if_block11 = /*anime*/ ctx[121]?.description && create_if_block_6$1(ctx);
    	const assign_div11 = () => /*div11_binding*/ ctx[58](div11, each_value, anime_index);
    	const unassign_div11 = () => /*div11_binding*/ ctx[58](null, each_value, anime_index);

    	function select_block_type_3(ctx, dirty) {
    		if (/*$hiddenEntries*/ ctx[12]) return create_if_block_5$1;
    		return create_else_block$1;
    	}

    	let current_block_type_3 = select_block_type_3(ctx);
    	let if_block12 = current_block_type_3(ctx);

    	function keydown_handler_8(...args) {
    		return /*keydown_handler_8*/ ctx[59](/*anime*/ ctx[121], ...args);
    	}

    	function keydown_handler_9(...args) {
    		return /*keydown_handler_9*/ ctx[60](/*anime*/ ctx[121], ...args);
    	}

    	function click_handler_6() {
    		return /*click_handler_6*/ ctx[61](/*anime*/ ctx[121]);
    	}

    	function keydown_handler_10(...args) {
    		return /*keydown_handler_10*/ ctx[62](/*anime*/ ctx[121], ...args);
    	}

    	const assign_div15 = () => /*div15_binding*/ ctx[63](div15, each_value, anime_index);
    	const unassign_div15 = () => /*div15_binding*/ ctx[63](null, each_value, anime_index);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div15 = element("div");
    			div14 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div1 = element("div");
    			if (if_block1) if_block1.c();
    			t2 = space();
    			div4 = element("div");
    			div3 = element("div");
    			label1 = element("label");
    			label0 = element("label");
    			t3 = text("Auto Play");
    			t4 = space();
    			input = element("input");
    			t5 = space();
    			span0 = element("span");
    			t6 = space();
    			h30 = element("h3");
    			if (if_block2) if_block2.c();
    			t7 = space();
    			if (if_block3) if_block3.c();
    			t8 = space();
    			if (if_block4) if_block4.c();
    			t9 = space();
    			div13 = element("div");
    			div11 = element("div");
    			div6 = element("div");
    			a0 = element("a");
    			t10 = text(t10_value);
    			t11 = space();
    			div5 = element("div");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t12 = space();
    			h31 = element("h3");
    			b = element("b");
    			t13 = text(t13_value);
    			t14 = space();
    			t15 = text(t15_value);
    			t16 = space();
    			t17 = text(t17_value);
    			html_tag = new HtmlTag(false);
    			t18 = space();
    			div7 = element("div");
    			if_block5.c();
    			t19 = space();
    			if_block6.c();
    			t20 = space();
    			div8 = element("div");
    			h40 = element("h4");
    			a1 = element("a");
    			span1 = element("span");
    			t21 = text(t21_value);
    			t22 = space();
    			if (if_block7) if_block7.c();
    			t23 = space();
    			h41 = element("h4");
    			t24 = text(t24_value);
    			t25 = space();
    			div9 = element("div");
    			if (if_block8) if_block8.c();
    			t26 = space();
    			if (if_block9) if_block9.c();
    			t27 = space();
    			if (if_block10) if_block10.c();
    			t28 = space();
    			div10 = element("div");
    			img = element("img");
    			t29 = space();
    			if (if_block11) if_block11.c();
    			t30 = space();
    			div12 = element("div");
    			button0 = element("button");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t31 = space();
    			if_block12.c();
    			t32 = space();
    			button1 = element("button");
    			svg3 = svg_element("svg");
    			path3 = svg_element("path");
    			t33 = text(" YouTube");
    			t34 = space();
    			button2 = element("button");
    			svg4 = svg_element("svg");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			t35 = text(" Anilist");
    			attr_dev(path0, "d", "M311 86a32 32 0 1 0-46-44L110 202l-46 47V64a32 32 0 1 0-64 0v384a32 32 0 1 0 64 0V341l65-67 133 192c10 15 30 18 44 8s18-30 8-44L174 227 311 86z");
    			add_location(path0, file$7, 1398, 36, 54258);
    			attr_dev(svg0, "viewBox", "0 0 320 512");
    			attr_dev(svg0, "class", "svelte-ofh824");
    			add_location(svg0, file$7, 1397, 32, 54193);
    			attr_dev(div0, "class", "popup-header-loading svelte-ofh824");
    			add_location(div0, file$7, 1395, 28, 54076);
    			attr_dev(div1, "class", "popup-img svelte-ofh824");
    			add_location(div1, file$7, 1406, 28, 54754);
    			attr_dev(div2, "class", div2_class_value = "" + (null_to_empty("popup-header " + (/*anime*/ ctx[121].trailerID ? "loader" : "")) + " svelte-ofh824"));
    			attr_dev(div2, "tabindex", "0");
    			add_location(div2, file$7, 1385, 24, 53550);
    			attr_dev(label0, "class", "disable-interaction svelte-ofh824");
    			attr_dev(label0, "for", label0_for_value = "auto-play-" + /*anime*/ ctx[121]?.id);
    			add_location(label0, file$7, 1437, 36, 56658);
    			attr_dev(input, "id", input_id_value = "auto-play-" + /*anime*/ ctx[121]?.id);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "autoplayToggle svelte-ofh824");
    			add_location(input, file$7, 1443, 36, 56979);
    			attr_dev(span0, "class", "slider round svelte-ofh824");
    			attr_dev(span0, "tabindex", "0");
    			add_location(span0, file$7, 1450, 36, 57413);
    			attr_dev(label1, "class", "switch svelte-ofh824");
    			add_location(label1, file$7, 1436, 32, 56598);
    			attr_dev(h30, "class", "autoplay-label svelte-ofh824");
    			add_location(h30, file$7, 1458, 32, 57857);
    			attr_dev(div3, "class", "autoPlay-container svelte-ofh824");
    			add_location(div3, file$7, 1435, 28, 56532);
    			attr_dev(div4, "class", "popup-controls svelte-ofh824");
    			add_location(div4, file$7, 1434, 24, 56474);
    			attr_dev(a0, "rel", a0_rel_value = /*anime*/ ctx[121].animeUrl ? "noopener noreferrer" : "");
    			attr_dev(a0, "target", a0_target_value = /*anime*/ ctx[121].animeUrl ? "_blank" : "");
    			attr_dev(a0, "href", a0_href_value = /*anime*/ ctx[121].animeUrl || "javascript:void(0)");
    			attr_dev(a0, "class", a0_class_value = "" + (null_to_empty(/*anime*/ ctx[121]?.contentCautionColor + "-color anime-title copy") + " svelte-ofh824"));
    			attr_dev(a0, "copy-value", a0_copy_value_value = /*anime*/ ctx[121]?.copiedTitle || "");
    			attr_dev(a0, "copy-value-2", a0_copy_value___value = /*anime*/ ctx[121]?.shownTitle || "");
    			set_style(a0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(a0, file$7, 1559, 36, 63974);
    			attr_dev(path1, "d", "M288 0c9 0 17 5 21 14l69 141 153 22c9 2 17 8 20 17s0 18-6 24L434 328l26 156c1 9-2 18-10 24s-17 6-25 1l-137-73-137 73c-8 4-18 4-25-2s-11-14-10-23l26-156L31 218a24 24 0 0 1 14-41l153-22 68-141c4-9 13-14 22-14zm0 79-53 108c-3 7-10 12-18 13L99 219l86 85c5 6 8 13 7 21l-21 120 106-57c7-3 15-3 22 1l105 56-20-120c-1-8 1-15 7-21l86-85-118-17c-8-2-15-7-18-14L288 79z");
    			add_location(path1, file$7, 1580, 45, 65323);
    			attr_dev(svg1, "viewBox", "0 0 576 512");
    			attr_dev(svg1, "class", "svelte-ofh824");
    			add_location(svg1, file$7, 1579, 40, 65250);
    			attr_dev(b, "class", "svelte-ofh824");
    			add_location(b, file$7, 1597, 44, 66696);
    			html_tag.a = null;
    			attr_dev(h31, "class", "copy svelte-ofh824");

    			attr_dev(h31, "copy-value", h31_copy_value_value = (/*anime*/ ctx[121].averageScore != null
    			? /*anime*/ ctx[121].formattedAverageScore || "NA"
    			: "NA") + "/10 · " + (/*anime*/ ctx[121].popularity != null
    			? /*anime*/ ctx[121].formattedPopularity || "NA"
    			: "NA"));

    			add_location(h31, file$7, 1584, 40, 65878);
    			attr_dev(div5, "class", "info-rating-wrapper svelte-ofh824");
    			add_location(div5, file$7, 1577, 36, 65112);
    			attr_dev(div6, "class", "anime-title-container svelte-ofh824");
    			set_style(div6, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div6, file$7, 1552, 32, 63600);
    			attr_dev(div7, "class", "info-format svelte-ofh824");
    			set_style(div7, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div7, file$7, 1613, 32, 67680);
    			attr_dev(span1, "class", span1_class_value = "" + (null_to_empty(/*anime*/ ctx[121].userStatusColor + "-color") + " svelte-ofh824"));
    			add_location(span1, file$7, 1688, 45, 72122);
    			attr_dev(a1, "rel", a1_rel_value = /*anime*/ ctx[121].animeUrl ? "noopener noreferrer" : "");
    			attr_dev(a1, "target", a1_target_value = /*anime*/ ctx[121].animeUrl ? "_blank" : "");
    			attr_dev(a1, "href", a1_href_value = /*anime*/ ctx[121].animeUrl || "javascript:void(0)");
    			attr_dev(a1, "class", "svelte-ofh824");
    			add_location(a1, file$7, 1679, 40, 71557);
    			attr_dev(h40, "class", "copy svelte-ofh824");

    			attr_dev(h40, "copy-value", h40_copy_value_value = (/*anime*/ ctx[121].userStatus || "NA") + (/*anime*/ ctx[121].userScore != null
    			? " · " + /*anime*/ ctx[121].userScore
    			: ""));

    			add_location(h40, file$7, 1672, 36, 71136);
    			set_style(h41, "text-align", "right");
    			attr_dev(h41, "class", "copy year-season svelte-ofh824");
    			attr_dev(h41, "copy-value", h41_copy_value_value = /*anime*/ ctx[121].status || "");
    			add_location(h41, file$7, 1706, 36, 73569);
    			attr_dev(div8, "class", "info-status svelte-ofh824");
    			set_style(div8, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(div8, file$7, 1665, 32, 70772);
    			attr_dev(div9, "class", "info-contents svelte-ofh824");
    			add_location(div9, file$7, 1714, 32, 73999);
    			attr_dev(img, "loading", "lazy");
    			attr_dev(img, "width", "150px");
    			attr_dev(img, "height", "210px");

    			attr_dev(img, "alt", img_alt_value = (/*anime*/ ctx[121]?.shownTitle || "") + (/*anime*/ ctx[121].coverImageUrl
    			? " Cover"
    			: /*anime*/ ctx[121].bannerImageUrl
    				? " Banner"
    				: " Thumbnail"));

    			attr_dev(img, "tabindex", "0");

    			attr_dev(img, "class", img_class_value = "" + (null_to_empty("coverImg" + (!/*anime*/ ctx[121].coverImageUrl && !/*anime*/ ctx[121].bannerImageUrl && !/*anime*/ ctx[121].trailerThumbnailUrl
    			? " display-none"
    			: "")) + " svelte-ofh824"));

    			add_location(img, file$7, 1887, 36, 86079);
    			attr_dev(div10, "class", "info-profile svelte-ofh824");
    			add_location(div10, file$7, 1885, 32, 85923);
    			attr_dev(div11, "class", "popup-info svelte-ofh824");
    			set_style(div11, "--windowWidth", /*windowWidth*/ ctx[4] + "px");
    			set_style(div11, "--windowHeight", /*windowHeight*/ ctx[5] + "px");
    			add_location(div11, file$7, 1546, 28, 63268);
    			attr_dev(path2, "d", "M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-72-280h144a24 24 0 1 1 0 48H184a24 24 0 1 1 0-48z");
    			add_location(path2, file$7, 1976, 41, 91562);
    			attr_dev(svg2, "class", "hideshow svelte-ofh824");
    			attr_dev(svg2, "viewBox", "0 0 512 512");
    			add_location(svg2, file$7, 1975, 36, 91476);
    			attr_dev(button0, "class", "hideshowbtn svelte-ofh824");
    			set_style(button0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(button0, file$7, 1958, 32, 90558);
    			attr_dev(path3, "d", "M550 124c-7-24-25-42-49-49-42-11-213-11-213-11S117 64 75 75c-24 7-42 25-49 49-11 43-11 132-11 132s0 90 11 133c7 23 25 41 49 48 42 11 213 11 213 11s171 0 213-11c24-7 42-25 49-48 11-43 11-133 11-133s0-89-11-132zM232 338V175l143 81-143 82z");
    			add_location(path3, file$7, 2001, 40, 93020);
    			attr_dev(svg3, "viewBox", "0 0 576 512");
    			attr_dev(svg3, "class", "svelte-ofh824");
    			add_location(svg3, file$7, 2000, 36, 92951);
    			attr_dev(button1, "class", "morevideos svelte-ofh824");
    			set_style(button1, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(button1, file$7, 1989, 32, 92318);
    			attr_dev(path4, "fill", "#3a5a7e");
    			attr_dev(path4, "d", "M111 111V41c0-4-2-6-6-6H91c-4 0-6 2-6 6v5l32 91h31c4 0 6-2 6-6v-14c0-4-2-6-6-6h-37z");
    			add_location(path4, file$7, 2020, 40, 94276);
    			attr_dev(path5, "d", "M54 35 18 137h28l6-17h31l6 17h28L81 35H54zm5 62 9-29 9 29H59z");
    			add_location(path5, file$7, 2024, 40, 94560);
    			attr_dev(svg4, "viewBox", "0 0 172 172");
    			attr_dev(svg4, "class", "svelte-ofh824");
    			add_location(svg4, file$7, 2019, 36, 94207);
    			attr_dev(button2, "class", "openanilist svelte-ofh824");
    			set_style(button2, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			add_location(button2, file$7, 2006, 32, 93484);
    			attr_dev(div12, "class", "footer svelte-ofh824");
    			add_location(div12, file$7, 1957, 28, 90504);
    			attr_dev(div13, "class", "popup-body svelte-ofh824");
    			add_location(div13, file$7, 1545, 24, 63214);
    			attr_dev(div14, "class", "popup-main svelte-ofh824");
    			add_location(div14, file$7, 1383, 20, 53420);
    			attr_dev(div15, "class", "popup-content svelte-ofh824");
    			add_location(div15, file$7, 1382, 16, 53340);
    			this.first = div15;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div15, anchor);
    			append_dev(div15, div14);
    			append_dev(div14, div2);
    			append_dev(div2, div0);
    			append_dev(div0, svg0);
    			append_dev(svg0, path0);
    			append_dev(div2, t0);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			if (if_block1) if_block1.m(div1, null);
    			assign_div2();
    			append_dev(div14, t2);
    			append_dev(div14, div4);
    			append_dev(div4, div3);
    			append_dev(div3, label1);
    			append_dev(label1, label0);
    			append_dev(label0, t3);
    			append_dev(label1, t4);
    			append_dev(label1, input);
    			input.checked = /*$autoPlay*/ ctx[11];
    			append_dev(label1, t5);
    			append_dev(label1, span0);
    			append_dev(div3, t6);
    			append_dev(div3, h30);
    			if (if_block2) if_block2.m(h30, null);
    			append_dev(div4, t7);
    			if (if_block3) if_block3.m(div4, null);
    			append_dev(div4, t8);
    			if (if_block4) if_block4.m(div4, null);
    			append_dev(div14, t9);
    			append_dev(div14, div13);
    			append_dev(div13, div11);
    			append_dev(div11, div6);
    			append_dev(div6, a0);
    			append_dev(a0, t10);
    			append_dev(div6, t11);
    			append_dev(div6, div5);
    			append_dev(div5, svg1);
    			append_dev(svg1, path1);
    			append_dev(div5, t12);
    			append_dev(div5, h31);
    			append_dev(h31, b);
    			append_dev(b, t13);
    			append_dev(h31, t14);
    			append_dev(h31, t15);
    			append_dev(h31, t16);
    			append_dev(h31, t17);
    			html_tag.m(raw_value, h31);
    			append_dev(div11, t18);
    			append_dev(div11, div7);
    			if_block5.m(div7, null);
    			append_dev(div7, t19);
    			if_block6.m(div7, null);
    			append_dev(div11, t20);
    			append_dev(div11, div8);
    			append_dev(div8, h40);
    			append_dev(h40, a1);
    			append_dev(a1, span1);
    			append_dev(span1, t21);
    			append_dev(a1, t22);
    			if (if_block7) if_block7.m(a1, null);
    			append_dev(div8, t23);
    			append_dev(div8, h41);
    			append_dev(h41, t24);
    			append_dev(div11, t25);
    			append_dev(div11, div9);
    			if (if_block8) if_block8.m(div9, null);
    			append_dev(div9, t26);
    			if (if_block9) if_block9.m(div9, null);
    			append_dev(div9, t27);
    			if (if_block10) if_block10.m(div9, null);
    			append_dev(div11, t28);
    			append_dev(div11, div10);
    			append_dev(div10, img);
    			append_dev(div10, t29);
    			if (if_block11) if_block11.m(div10, null);
    			assign_div11();
    			append_dev(div13, t30);
    			append_dev(div13, div12);
    			append_dev(div12, button0);
    			append_dev(button0, svg2);
    			append_dev(svg2, path2);
    			append_dev(button0, t31);
    			if_block12.m(button0, null);
    			append_dev(div12, t32);
    			append_dev(div12, button1);
    			append_dev(button1, svg3);
    			append_dev(svg3, path3);
    			append_dev(button1, t33);
    			append_dev(div12, t34);
    			append_dev(div12, button2);
    			append_dev(button2, svg4);
    			append_dev(svg4, path4);
    			append_dev(svg4, path5);
    			append_dev(button2, t35);
    			assign_div15();

    			if (!mounted) {
    				dispose = [
    					listen_dev(div2, "click", click_handler, false, false, false, false),
    					listen_dev(div2, "keydown", keydown_handler, false, false, false, false),
    					listen_dev(input, "change", /*input_change_handler*/ ctx[41]),
    					listen_dev(span0, "keydown", /*keydown_handler_1*/ ctx[42], false, false, false, false),
    					listen_dev(h30, "click", /*click_handler_1*/ ctx[43], false, false, false, false),
    					listen_dev(h30, "keydown", /*keydown_handler_2*/ ctx[44], false, false, false, false),
    					listen_dev(a0, "scroll", /*itemScroll*/ ctx[24], false, false, false, false),
    					listen_dev(div6, "scroll", /*itemScroll*/ ctx[24], false, false, false, false),
    					listen_dev(div7, "scroll", /*itemScroll*/ ctx[24], false, false, false, false),
    					listen_dev(div8, "scroll", /*itemScroll*/ ctx[24], false, false, false, false),
    					action_destroyer(addImage_action = /*addImage*/ ctx[34].call(null, img, /*anime*/ ctx[121].coverImageUrl || /*anime*/ ctx[121].bannerImageUrl || /*anime*/ ctx[121].trailerThumbnailUrl || emptyImage)),
    					listen_dev(img, "error", /*error_handler_1*/ ctx[53], false, false, false, false),
    					listen_dev(img, "click", click_handler_4, false, false, false, false),
    					listen_dev(img, "keydown", keydown_handler_6, false, false, false, false),
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*handleHideShow*/ ctx[18](/*anime*/ ctx[121].id, /*anime*/ ctx[121]?.shownTitle))) /*handleHideShow*/ ctx[18](/*anime*/ ctx[121].id, /*anime*/ ctx[121]?.shownTitle).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(button0, "keydown", keydown_handler_8, false, false, false, false),
    					listen_dev(
    						button1,
    						"click",
    						function () {
    							if (is_function(/*handleMoreVideos*/ ctx[20](/*anime*/ ctx[121].title))) /*handleMoreVideos*/ ctx[20](/*anime*/ ctx[121].title).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(button1, "keydown", keydown_handler_9, false, false, false, false),
    					listen_dev(button2, "click", click_handler_6, false, false, false, false),
    					listen_dev(button2, "keydown", keydown_handler_10, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*anime*/ ctx[121].trailerID) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_18$1(ctx);
    					if_block0.c();
    					if_block0.m(div2, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*anime*/ ctx[121].bannerImageUrl || /*anime*/ ctx[121].trailerThumbnailUrl) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_17$1(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && div2_class_value !== (div2_class_value = "" + (null_to_empty("popup-header " + (/*anime*/ ctx[121].trailerID ? "loader" : "")) + " svelte-ofh824"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			if (each_value !== /*each_value*/ ctx[122] || anime_index !== /*anime_index*/ ctx[123]) {
    				unassign_div2();
    				each_value = /*each_value*/ ctx[122];
    				anime_index = /*anime_index*/ ctx[123];
    				assign_div2();
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && label0_for_value !== (label0_for_value = "auto-play-" + /*anime*/ ctx[121]?.id)) {
    				attr_dev(label0, "for", label0_for_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && input_id_value !== (input_id_value = "auto-play-" + /*anime*/ ctx[121]?.id)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty[0] & /*$autoPlay*/ 2048) {
    				input.checked = /*$autoPlay*/ ctx[11];
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block2) if_block2.d(1);
    				if_block2 = current_block_type && current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(h30, null);
    				}
    			}

    			if (/*$listUpdateAvailable*/ ctx[13]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_14$1(ctx);
    					if_block3.c();
    					if_block3.m(div4, t8);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*anime*/ ctx[121].bannerImageUrl || /*anime*/ ctx[121].trailerThumbnailUrl) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_13$1(ctx);
    					if_block4.c();
    					if_block4.m(div4, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t10_value !== (t10_value = (/*anime*/ ctx[121]?.shownTitle || "NA") + "")) set_data_dev(t10, t10_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a0_rel_value !== (a0_rel_value = /*anime*/ ctx[121].animeUrl ? "noopener noreferrer" : "")) {
    				attr_dev(a0, "rel", a0_rel_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a0_target_value !== (a0_target_value = /*anime*/ ctx[121].animeUrl ? "_blank" : "")) {
    				attr_dev(a0, "target", a0_target_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a0_href_value !== (a0_href_value = /*anime*/ ctx[121].animeUrl || "javascript:void(0)")) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a0_class_value !== (a0_class_value = "" + (null_to_empty(/*anime*/ ctx[121]?.contentCautionColor + "-color anime-title copy") + " svelte-ofh824"))) {
    				attr_dev(a0, "class", a0_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a0_copy_value_value !== (a0_copy_value_value = /*anime*/ ctx[121]?.copiedTitle || "")) {
    				attr_dev(a0, "copy-value", a0_copy_value_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a0_copy_value___value !== (a0_copy_value___value = /*anime*/ ctx[121]?.shownTitle || "")) {
    				attr_dev(a0, "copy-value-2", a0_copy_value___value);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(a0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t13_value !== (t13_value = (/*anime*/ ctx[121].averageScore != null
    			? /*anime*/ ctx[121].formattedAverageScore || "NA"
    			: "NA") + "")) set_data_dev(t13, t13_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t15_value !== (t15_value = "/10 · " + (/*anime*/ ctx[121].popularity != null
    			? /*anime*/ ctx[121].formattedPopularity || "NA"
    			: "NA") + "")) set_data_dev(t15, t15_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && raw_value !== (raw_value = (/*anime*/ ctx[121]?.recommendedRatingInfo || "") + "")) html_tag.p(raw_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && h31_copy_value_value !== (h31_copy_value_value = (/*anime*/ ctx[121].averageScore != null
    			? /*anime*/ ctx[121].formattedAverageScore || "NA"
    			: "NA") + "/10 · " + (/*anime*/ ctx[121].popularity != null
    			? /*anime*/ ctx[121].formattedPopularity || "NA"
    			: "NA"))) {
    				attr_dev(h31, "copy-value", h31_copy_value_value);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(div6, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block5) {
    				if_block5.p(ctx, dirty);
    			} else {
    				if_block5.d(1);
    				if_block5 = current_block_type_1(ctx);

    				if (if_block5) {
    					if_block5.c();
    					if_block5.m(div7, t19);
    				}
    			}

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_2(ctx)) && if_block6) {
    				if_block6.p(ctx, dirty);
    			} else {
    				if_block6.d(1);
    				if_block6 = current_block_type_2(ctx);

    				if (if_block6) {
    					if_block6.c();
    					if_block6.m(div7, null);
    				}
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(div7, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t21_value !== (t21_value = (/*anime*/ ctx[121].userStatus || "NA") + "")) set_data_dev(t21, t21_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && span1_class_value !== (span1_class_value = "" + (null_to_empty(/*anime*/ ctx[121].userStatusColor + "-color") + " svelte-ofh824"))) {
    				attr_dev(span1, "class", span1_class_value);
    			}

    			if (/*anime*/ ctx[121].userScore != null) {
    				if (if_block7) {
    					if_block7.p(ctx, dirty);
    				} else {
    					if_block7 = create_if_block_10$1(ctx);
    					if_block7.c();
    					if_block7.m(a1, null);
    				}
    			} else if (if_block7) {
    				if_block7.d(1);
    				if_block7 = null;
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a1_rel_value !== (a1_rel_value = /*anime*/ ctx[121].animeUrl ? "noopener noreferrer" : "")) {
    				attr_dev(a1, "rel", a1_rel_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a1_target_value !== (a1_target_value = /*anime*/ ctx[121].animeUrl ? "_blank" : "")) {
    				attr_dev(a1, "target", a1_target_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && a1_href_value !== (a1_href_value = /*anime*/ ctx[121].animeUrl || "javascript:void(0)")) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && h40_copy_value_value !== (h40_copy_value_value = (/*anime*/ ctx[121].userStatus || "NA") + (/*anime*/ ctx[121].userScore != null
    			? " · " + /*anime*/ ctx[121].userScore
    			: ""))) {
    				attr_dev(h40, "copy-value", h40_copy_value_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && t24_value !== (t24_value = (/*anime*/ ctx[121].status || "NA") + "")) set_data_dev(t24, t24_value);

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && h41_copy_value_value !== (h41_copy_value_value = /*anime*/ ctx[121].status || "")) {
    				attr_dev(h41, "copy-value", h41_copy_value_value);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(div8, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (/*anime*/ ctx[121]?.shownStudios?.length) {
    				if (if_block8) {
    					if_block8.p(ctx, dirty);
    				} else {
    					if_block8 = create_if_block_9$1(ctx);
    					if_block8.c();
    					if_block8.m(div9, t26);
    				}
    			} else if (if_block8) {
    				if_block8.d(1);
    				if_block8 = null;
    			}

    			if (/*anime*/ ctx[121]?.shownGenres?.length) {
    				if (if_block9) {
    					if_block9.p(ctx, dirty);
    				} else {
    					if_block9 = create_if_block_8$1(ctx);
    					if_block9.c();
    					if_block9.m(div9, t27);
    				}
    			} else if (if_block9) {
    				if_block9.d(1);
    				if_block9 = null;
    			}

    			if (/*anime*/ ctx[121]?.shownTags?.length) {
    				if (if_block10) {
    					if_block10.p(ctx, dirty);
    				} else {
    					if_block10 = create_if_block_7$1(ctx);
    					if_block10.c();
    					if_block10.m(div9, null);
    				}
    			} else if (if_block10) {
    				if_block10.d(1);
    				if_block10 = null;
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && img_alt_value !== (img_alt_value = (/*anime*/ ctx[121]?.shownTitle || "") + (/*anime*/ ctx[121].coverImageUrl
    			? " Cover"
    			: /*anime*/ ctx[121].bannerImageUrl
    				? " Banner"
    				: " Thumbnail"))) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 1024 && img_class_value !== (img_class_value = "" + (null_to_empty("coverImg" + (!/*anime*/ ctx[121].coverImageUrl && !/*anime*/ ctx[121].bannerImageUrl && !/*anime*/ ctx[121].trailerThumbnailUrl
    			? " display-none"
    			: "")) + " svelte-ofh824"))) {
    				attr_dev(img, "class", img_class_value);
    			}

    			if (addImage_action && is_function(addImage_action.update) && dirty[0] & /*$finalAnimeList*/ 1024) addImage_action.update.call(null, /*anime*/ ctx[121].coverImageUrl || /*anime*/ ctx[121].bannerImageUrl || /*anime*/ ctx[121].trailerThumbnailUrl || emptyImage);

    			if (/*anime*/ ctx[121]?.description) {
    				if (if_block11) {
    					if_block11.p(ctx, dirty);
    				} else {
    					if_block11 = create_if_block_6$1(ctx);
    					if_block11.c();
    					if_block11.m(div10, null);
    				}
    			} else if (if_block11) {
    				if_block11.d(1);
    				if_block11 = null;
    			}

    			if (each_value !== /*each_value*/ ctx[122] || anime_index !== /*anime_index*/ ctx[123]) {
    				unassign_div11();
    				each_value = /*each_value*/ ctx[122];
    				anime_index = /*anime_index*/ ctx[123];
    				assign_div11();
    			}

    			if (dirty[0] & /*windowWidth*/ 16) {
    				set_style(div11, "--windowWidth", /*windowWidth*/ ctx[4] + "px");
    			}

    			if (dirty[0] & /*windowHeight*/ 32) {
    				set_style(div11, "--windowHeight", /*windowHeight*/ ctx[5] + "px");
    			}

    			if (current_block_type_3 === (current_block_type_3 = select_block_type_3(ctx)) && if_block12) {
    				if_block12.p(ctx, dirty);
    			} else {
    				if_block12.d(1);
    				if_block12 = current_block_type_3(ctx);

    				if (if_block12) {
    					if_block12.c();
    					if_block12.m(button0, null);
    				}
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(button0, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(button1, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 256) {
    				set_style(button2, "overflow", /*$popupIsGoingBack*/ ctx[8] ? "hidden" : "");
    			}

    			if (each_value !== /*each_value*/ ctx[122] || anime_index !== /*anime_index*/ ctx[123]) {
    				unassign_div15();
    				each_value = /*each_value*/ ctx[122];
    				anime_index = /*anime_index*/ ctx[123];
    				assign_div15();
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div15);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			unassign_div2();

    			if (if_block2) {
    				if_block2.d();
    			}

    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if_block5.d();
    			if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			if (if_block9) if_block9.d();
    			if (if_block10) if_block10.d();
    			if (if_block11) if_block11.d();
    			unassign_div11();
    			if_block12.d();
    			unassign_div15();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(1382:12) {#each $finalAnimeList || [] as anime (anime?.id || {}",
    		ctx
    	});

    	return block;
    }

    // (2035:12) {#if $finalAnimeList?.length && !$shownAllInList}
    function create_if_block_4$1(ctx) {
    	let div;
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M311 86a32 32 0 1 0-46-44L110 202l-46 47V64a32 32 0 1 0-64 0v384a32 32 0 1 0 64 0V341l65-67 133 192c10 15 30 18 44 8s18-30 8-44L174 227 311 86z");
    			add_location(path, file$7, 2040, 25, 95269);
    			attr_dev(svg, "class", "popup-content-loading-icon svelte-ofh824");
    			attr_dev(svg, "viewBox", "0 0 320 512");
    			add_location(svg, file$7, 2037, 20, 95131);
    			attr_dev(div, "class", "popup-content-loading svelte-ofh824");
    			add_location(div, file$7, 2035, 16, 95037);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(2035:12) {#if $finalAnimeList?.length && !$shownAllInList}",
    		ctx
    	});

    	return block;
    }

    // (2050:0) {#if $popupVisible && $popupIsGoingBack}
    function create_if_block_2$2(ctx) {
    	let div1;
    	let div0;
    	let svg;
    	let path;
    	let div0_class_value;
    	let div1_outro;
    	let current;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M41 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 256l138-137a32 32 0 0 0-46-46L41 233z");
    			add_location(path, file$7, 2061, 17, 96060);
    			attr_dev(svg, "viewBox", "0 0 320 512");
    			attr_dev(svg, "class", "svelte-ofh824");
    			add_location(svg, file$7, 2060, 12, 96015);
    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty("go-back-grid" + (/*goBackPercent*/ ctx[6] >= 100 ? " willGoBack" : "")) + " svelte-ofh824"));
    			add_location(div0, file$7, 2056, 8, 95871);
    			attr_dev(div1, "class", "go-back-grid-highlight svelte-ofh824");
    			set_style(div1, "--scale", Math.max(1, (/*goBackPercent*/ ctx[6] ?? 1) * 0.01 * 2));
    			set_style(div1, "--position", "-" + (100 - (/*goBackPercent*/ ctx[6] ?? 0)) + "%");
    			add_location(div1, file$7, 2050, 4, 95633);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, svg);
    			append_dev(svg, path);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*goBackPercent*/ 64 && div0_class_value !== (div0_class_value = "" + (null_to_empty("go-back-grid" + (/*goBackPercent*/ ctx[6] >= 100 ? " willGoBack" : "")) + " svelte-ofh824"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty[0] & /*goBackPercent*/ 64) {
    				set_style(div1, "--scale", Math.max(1, (/*goBackPercent*/ ctx[6] ?? 1) * 0.01 * 2));
    			}

    			if (dirty[0] & /*goBackPercent*/ 64) {
    				set_style(div1, "--position", "-" + (100 - (/*goBackPercent*/ ctx[6] ?? 0)) + "%");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (div1_outro) div1_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			div1_outro = create_out_transition(div1, fade, { duration: 200 });
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
    		source: "(2050:0) {#if $popupVisible && $popupIsGoingBack}",
    		ctx
    	});

    	return block;
    }

    // (2069:0) {#if fullDescriptionPopup}
    function create_if_block_1$4(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let div0_outro;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "tabindex", "0");
    			attr_dev(div0, "class", "fullPopupDescription svelte-ofh824");
    			add_location(div0, file$7, 2081, 16, 96851);
    			attr_dev(div1, "class", "fullPopupDescriptionWrapper svelte-ofh824");
    			add_location(div1, file$7, 2080, 12, 96792);
    			attr_dev(div2, "class", "fullPopup svelte-ofh824");
    			attr_dev(div2, "id", "fullPopup");
    			add_location(div2, file$7, 2079, 8, 96740);
    			attr_dev(div3, "class", "fullPopupWrapper svelte-ofh824");
    			add_location(div3, file$7, 2069, 4, 96292);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			div0.innerHTML = /*fullDescriptionPopup*/ ctx[1];
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "keydown", /*keydown_handler_12*/ ctx[67], false, false, false, false),
    					listen_dev(div0, "scroll", /*fullViewScroll*/ ctx[29], false, false, false, false),
    					listen_dev(div3, "click", /*click_handler_7*/ ctx[68], false, false, false, false),
    					listen_dev(div3, "keydown", /*keydown_handler_13*/ ctx[69], false, false, false, false),
    					listen_dev(div3, "touchstart", /*fullViewTouchStart*/ ctx[30], { passive: true }, false, false, false),
    					listen_dev(div3, "touchend", /*fullViewTouchEnd*/ ctx[31], { passive: true }, false, false, false),
    					listen_dev(div3, "touchcancel", /*fullViewTouchCancel*/ ctx[32], { passive: true }, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*fullDescriptionPopup*/ 2) div0.innerHTML = /*fullDescriptionPopup*/ ctx[1];		},
    		i: function intro(local) {
    			if (current) return;
    			if (div0_outro) div0_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			div0_outro = create_out_transition(div0, fade, { duration: 200 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (detaching && div0_outro) div0_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(2069:0) {#if fullDescriptionPopup}",
    		ctx
    	});

    	return block;
    }

    // (2097:0) {#if fullImagePopup}
    function create_if_block$5(ctx) {
    	let div1;
    	let div0;
    	let img;
    	let addImage_action;
    	let img_outro;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			attr_dev(img, "tabindex", "0");
    			attr_dev(img, "class", "fullPopupImage svelte-ofh824");
    			attr_dev(img, "loading", "lazy");
    			attr_dev(img, "alt", "Full View");
    			add_location(img, file$7, 2108, 12, 97872);
    			attr_dev(div0, "class", "fullPopup svelte-ofh824");
    			attr_dev(div0, "id", "fullPopup");
    			add_location(div0, file$7, 2107, 8, 97820);
    			attr_dev(div1, "class", "fullPopupWrapper svelte-ofh824");
    			add_location(div1, file$7, 2097, 4, 97372);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(addImage_action = /*addImage*/ ctx[34].call(null, img, /*fullImagePopup*/ ctx[0] || emptyImage)),
    					listen_dev(img, "keydown", /*keydown_handler_14*/ ctx[70], false, false, false, false),
    					listen_dev(img, "error", /*error_handler_2*/ ctx[71], false, false, false, false),
    					listen_dev(div1, "click", /*click_handler_8*/ ctx[72], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_15*/ ctx[73], false, false, false, false),
    					listen_dev(div1, "touchstart", /*fullViewTouchStart*/ ctx[30], { passive: true }, false, false, false),
    					listen_dev(div1, "touchend", /*fullViewTouchEnd*/ ctx[31], { passive: true }, false, false, false),
    					listen_dev(div1, "touchcancel", /*fullViewTouchCancel*/ ctx[32], { passive: true }, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (addImage_action && is_function(addImage_action.update) && dirty[0] & /*fullImagePopup*/ 1) addImage_action.update.call(null, /*fullImagePopup*/ ctx[0] || emptyImage);
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (img_outro) img_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			img_outro = create_out_transition(img, fade, { duration: 200 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching && img_outro) img_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(2097:0) {#if fullImagePopup}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
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
    	let if_block2 = /*fullDescriptionPopup*/ ctx[1] && create_if_block_1$4(ctx);
    	let if_block3 = /*fullImagePopup*/ ctx[0] && create_if_block$5(ctx);

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
    			attr_dev(div0, "class", "popup-container hide svelte-ofh824");
    			add_location(div0, file$7, 1370, 4, 52843);
    			attr_dev(div1, "id", "popup-wrapper");
    			attr_dev(div1, "class", "popup-wrapper svelte-ofh824");
    			add_location(div1, file$7, 1363, 0, 52640);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			if (if_block0) if_block0.m(div0, null);
    			/*div0_binding*/ ctx[64](div0);
    			/*div1_binding*/ ctx[66](div1);
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
    					listen_dev(div0, "touchstart", /*handlePopupContainerDown*/ ctx[25], { passive: true }, false, false, false),
    					listen_dev(div0, "touchmove", /*handlePopupContainerMove*/ ctx[26], { passive: true }, false, false, false),
    					listen_dev(div0, "touchend", /*handlePopupContainerUp*/ ctx[27], { passive: true }, false, false, false),
    					listen_dev(div0, "touchcancel", /*handlePopupContainerCancel*/ ctx[28], { passive: true }, false, false, false),
    					listen_dev(div0, "scroll", /*popupScroll*/ ctx[23], false, false, false, false),
    					listen_dev(div1, "click", /*handlePopupVisibility*/ ctx[17], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_11*/ ctx[65], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*$finalAnimeList*/ ctx[10]?.length) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3$2(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
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

    			if (/*fullDescriptionPopup*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*fullDescriptionPopup*/ 2) {
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

    			if (/*fullImagePopup*/ ctx[0]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty[0] & /*fullImagePopup*/ 1) {
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
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			/*div0_binding*/ ctx[64](null);
    			/*div1_binding*/ ctx[66](null);
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const emptyImage = "data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

    function openInAnilist(animeUrl) {
    	if (typeof animeUrl !== "string" || animeUrl === "") return;
    	window.open(animeUrl, "_blank");
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

    function cleanText$1(k) {
    	k = k !== "_" ? k?.replace?.(/\_/g, " ") : k;
    	k = k !== '\\"' ? k?.replace?.(/\\"/g, '"') : k;
    	k = k?.replace?.(/\b(tv|ona|ova)\b/gi, match => match?.toUpperCase?.());
    	return k?.toLowerCase?.() || "";
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $isFullViewed;
    	let $android;
    	let $popupIsGoingBack;
    	let $popupVisible;
    	let $dataStatus;
    	let $ytPlayers;
    	let $updateRecommendationList;
    	let $finalAnimeList;
    	let $autoPlay;
    	let $inApp;
    	let $initData;
    	let $hiddenEntries;
    	let $newFinalAnime;
    	let $animeLoaderWorker;
    	let $listUpdateAvailable;
    	let $listIsUpdating;
    	let $confirmPromise;
    	let $animeObserver;
    	let $openedAnimePopupIdx;
    	let $checkAnimeLoaderStatus;
    	let $earlisetReleaseDate;
    	let $shownAllInList;
    	validate_store(isFullViewed, 'isFullViewed');
    	component_subscribe($$self, isFullViewed, $$value => $$invalidate(99, $isFullViewed = $$value));
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(35, $android = $$value));
    	validate_store(popupIsGoingBack, 'popupIsGoingBack');
    	component_subscribe($$self, popupIsGoingBack, $$value => $$invalidate(8, $popupIsGoingBack = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(9, $popupVisible = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(100, $dataStatus = $$value));
    	validate_store(ytPlayers, 'ytPlayers');
    	component_subscribe($$self, ytPlayers, $$value => $$invalidate(101, $ytPlayers = $$value));
    	validate_store(updateRecommendationList, 'updateRecommendationList');
    	component_subscribe($$self, updateRecommendationList, $$value => $$invalidate(102, $updateRecommendationList = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(10, $finalAnimeList = $$value));
    	validate_store(autoPlay, 'autoPlay');
    	component_subscribe($$self, autoPlay, $$value => $$invalidate(11, $autoPlay = $$value));
    	validate_store(inApp, 'inApp');
    	component_subscribe($$self, inApp, $$value => $$invalidate(103, $inApp = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(104, $initData = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(12, $hiddenEntries = $$value));
    	validate_store(newFinalAnime, 'newFinalAnime');
    	component_subscribe($$self, newFinalAnime, $$value => $$invalidate(105, $newFinalAnime = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(106, $animeLoaderWorker = $$value));
    	validate_store(listUpdateAvailable, 'listUpdateAvailable');
    	component_subscribe($$self, listUpdateAvailable, $$value => $$invalidate(13, $listUpdateAvailable = $$value));
    	validate_store(listIsUpdating, 'listIsUpdating');
    	component_subscribe($$self, listIsUpdating, $$value => $$invalidate(14, $listIsUpdating = $$value));
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(107, $confirmPromise = $$value));
    	validate_store(animeObserver, 'animeObserver');
    	component_subscribe($$self, animeObserver, $$value => $$invalidate(108, $animeObserver = $$value));
    	validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
    	component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(109, $openedAnimePopupIdx = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(110, $checkAnimeLoaderStatus = $$value));
    	validate_store(earlisetReleaseDate, 'earlisetReleaseDate');
    	component_subscribe($$self, earlisetReleaseDate, $$value => $$invalidate(15, $earlisetReleaseDate = $$value));
    	validate_store(shownAllInList, 'shownAllInList');
    	component_subscribe($$self, shownAllInList, $$value => $$invalidate(16, $shownAllInList = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AnimePopup', slots, []);
    	let isOnline = window.navigator.onLine;

    	let animeGridParentEl,
    		mostVisiblePopupHeader,
    		currentHeaderIdx,
    		currentYtPlayer,
    		popupWrapper,
    		popupContainer,
    		popupAnimeObserver,
    		fullImagePopup,
    		fullDescriptionPopup,
    		windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth),
    		windowHeight = Math.max(window.visualViewport.height, window.innerHeight),
    		videoLoops = {};

    	let savedYtVolume = !$android && matchMedia("(hover:hover)").matches
    	? 50
    	: 100;

    	(async () => {
    		savedYtVolume = await retrieveJSON("savedYtVolume") || savedYtVolume;
    	})();

    	function addPopupObserver() {
    		popupAnimeObserver?.disconnect?.();
    		popupAnimeObserver = null;

    		popupAnimeObserver = new IntersectionObserver(() => {
    				if (!$popupVisible) return;
    				let visiblePopupHeader = getMostVisibleElement(popupContainer, ".popup-header", windowHeight > 360 ? 0.5 : 0) || getMostVisibleElement(popupContainer, ".popup-content", 0)?.getElementsByClassName("popup-header")?.[0];
    				mostVisiblePopupHeader = visiblePopupHeader;
    				playMostVisibleTrailer();
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

    	async function handleHideShow(animeID, title) {
    		if (!$hiddenEntries) return pleaseWaitAlert();
    		let isHidden = $hiddenEntries[animeID];

    		title = title
    		? `<span style="color:#00cbf9;">${title}</span>`
    		: "this anime";

    		if (isHidden) {
    			if (await $confirmPromise(`Do you want to unhide ${title} in your recommendation list?`)) {
    				$checkAnimeLoaderStatus().then(async () => {
    					delete $hiddenEntries[animeID];
    					hiddenEntries.set($hiddenEntries);

    					if ($finalAnimeList.length) {
    						if ($animeLoaderWorker instanceof Worker) {
    							$animeLoaderWorker?.postMessage?.({
    								removeID: animeID,
    								hiddenEntries: $hiddenEntries
    							});
    						}
    					}
    				}).catch(() => {
    					$confirmPromise({
    						isAlert: true,
    						title: "Something went wrong",
    						text: "Failed to unhide the anime, please try again."
    					});
    				});
    			}
    		} else {
    			if (await $confirmPromise(`Do you want to hide ${title} in your recommendation list?`)) {
    				$checkAnimeLoaderStatus().then(async () => {
    					set_store_value(hiddenEntries, $hiddenEntries[animeID] = true, $hiddenEntries);

    					if ($finalAnimeList.length) {
    						if ($animeLoaderWorker instanceof Worker) {
    							$animeLoaderWorker?.postMessage?.({
    								removeID: animeID,
    								hiddenEntries: $hiddenEntries
    							});
    						}
    					}
    				}).catch(() => {
    					$confirmPromise({
    						isAlert: true,
    						title: "Something went wrong",
    						text: "Failed to hide the anime, please try again."
    					});
    				});
    			}
    		}
    	}

    	async function pleaseWaitAlert() {
    		return await $confirmPromise({
    			isAlert: true,
    			title: "Initializing resources",
    			text: "Please wait a moment..."
    		});
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
    			title: "See related videos",
    			text: "Do you want to see more related videos in YouTube?",
    			isImportant: true
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
    		window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(animeTitle + " Anime")}`, "_blank");
    	}

    	animeIdxRemoved.subscribe(async removedIdx => {
    		if ($popupVisible && removedIdx != null && removedIdx >= 0) {
    			await tick();
    			let newPopupContent = popupContainer?.children?.[removedIdx];

    			if (newPopupContent instanceof Element && popupContainer instanceof Element) {
    				scrollToElement(popupContainer, newPopupContent, "top");
    			}
    		}
    	});

    	popupVisible.subscribe(async val => {
    		if (!(popupWrapper instanceof Element) || !(popupContainer instanceof Element)) return;

    		if (val === true) {
    			// Scroll To Opened Anime
    			let openedAnimePopupEl = popupContainer?.children[$openedAnimePopupIdx ?? currentHeaderIdx ?? 0];

    			if (openedAnimePopupEl instanceof Element) {
    				scrollToElement(popupContainer, openedAnimePopupEl, "top", "instant");

    				// Animate Opening
    				requestAnimationFrame(() => {
    					addClass(popupWrapper, "willChange");
    					addClass(popupContainer, "willChange");
    					addClass(popupWrapper, "visible");
    					addClass(popupContainer, "show");

    					setTimeout(
    						() => {
    							removeClass(popupWrapper, "willChange");
    							removeClass(popupContainer, "willChange");
    						},
    						200
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

    						if ($inApp && $autoPlay) {
    							await tick();
    							prePlayYtPlayer($ytPlayers[i].ytPlayer);
    							$ytPlayers[i].ytPlayer?.playVideo?.();
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
    					addClass(popupWrapper, "willChange");
    					addClass(popupContainer, "willChange");
    					addClass(popupWrapper, "visible");
    					addClass(popupContainer, "show");

    					setTimeout(
    						() => {
    							removeClass(popupWrapper, "willChange");
    							removeClass(popupContainer, "willChange");
    						},
    						200
    					);
    				});
    			}
    		} else if (val === false) {
    			requestAnimationFrame(() => {
    				addClass(popupWrapper, "willChange");
    				addClass(popupContainer, "willChange");
    				removeClass(popupContainer, "show");

    				setTimeout(
    					() => {
    						// Stop All Player
    						$ytPlayers.forEach(({ ytPlayer }) => {
    							ytPlayer?.pauseVideo?.();
    						});

    						removeClass(popupWrapper, "visible");
    						removeClass(popupContainer, "willChange");

    						setTimeout(
    							() => {
    								removeClass(popupWrapper, "willChange");
    							},
    							200
    						);
    					},
    					200
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

    			let observedIdx = $finalAnimeList.length - 1;
    			let lastAnimeContent = $finalAnimeList[observedIdx];
    			let lastPopupContent = lastAnimeContent.popupContent || popupContainer.children?.[observedIdx];

    			if ($animeObserver && lastPopupContent instanceof Element) {
    				if (observedIdx > 0) {
    					let prevAnimeContent = $finalAnimeList[observedIdx - 1];
    					let prevPopupContent = prevAnimeContent.popupContent || popupContainer.children?.[observedIdx - 1];

    					if (prevPopupContent instanceof Element) {
    						$animeObserver.observe(prevPopupContent);
    					}
    				}

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
    			}
    		}
    	});

    	onMount(() => {
    		$$invalidate(2, popupWrapper = popupWrapper || document.getElementById("popup-wrapper"));
    		$$invalidate(3, popupContainer = popupContainer || popupWrapper.querySelector("#popup-container"));
    		animeGridParentEl = document.getElementById("anime-grid");

    		window.addEventListener("resize", () => {
    			if (document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen || document.msFullscreenElement) return;
    			$$invalidate(4, windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth));
    			$$invalidate(5, windowHeight = Math.max(window.visualViewport.height, window.innerHeight));
    		});

    		document.addEventListener("keydown", async e => {
    			if (e.key === "Escape" && !document.fullscreenElement) {
    				e.preventDefault();
    				window.backPressed?.();
    			}

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
    					animeGrid.scrollIntoView({ behavior: "smooth" });
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
    				if ($ytPlayers[i].ytPlayer.g === visibleTrailer && $ytPlayers[i].ytPlayer?.getPlayerState?.() !== 1) {
    					await tick();

    					if ($popupVisible && $inApp && ($autoPlay || $ytPlayers[i].ytPlayer?.getPlayerState?.() === 2)) {
    						prePlayYtPlayer($ytPlayers[i].ytPlayer);
    						$ytPlayers[i].ytPlayer?.playVideo?.();
    					} else {
    						if (!$autoPlay) {
    							let ytPlayer = $ytPlayers?.[i]?.ytPlayer;
    							let trailerEl = ytPlayer?.g;

    							if (trailerEl && ytPlayer?.getPlayerState?.() != null && ytPlayer?.getPlayerState?.() !== -1) {
    								let popupHeader = trailerEl?.parentElement;
    								let popupImg = popupHeader?.querySelector?.(".popup-img");
    								addClass(popupImg, "fade-out");
    								removeClass(popupHeader, "loader");
    								removeClass(trailerEl, "display-none");

    								setTimeout(
    									() => {
    										addClass(popupImg, "display-none");
    										removeClass(popupImg, "fade-out");
    									},
    									200
    								);
    							}
    						}

    						$ytPlayers[i].ytPlayer?.pauseVideo?.();
    					}
    				} else if ($ytPlayers[i].ytPlayer.g !== visibleTrailer) {
    					if (!$autoPlay) {
    						let ytPlayer = $ytPlayers?.[i]?.ytPlayer;
    						let trailerEl = ytPlayer?.g;

    						if (trailerEl && ytPlayer?.getPlayerState?.() != null && ytPlayer?.getPlayerState?.() !== -1) {
    							let popupHeader = trailerEl?.parentElement;
    							let popupImg = popupHeader?.querySelector?.(".popup-img");
    							addClass(popupImg, "fade-out");
    							removeClass(popupHeader, "loader");
    							removeClass(trailerEl, "display-none");

    							setTimeout(
    								() => {
    									addClass(popupImg, "display-none");
    									removeClass(popupImg, "fade-out");
    								},
    								200
    							);
    						}
    					}

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
    		let popupContent = popupHeader?.closest?.(".popup-content");
    		let loopedAnimeID = $finalAnimeList?.[getChildIndex(popupContent) ?? -1]?.id;

    		if (_ytPlayer?.getPlayerState?.() === 0) {
    			if (loopedAnimeID != null) {
    				if (videoLoops[loopedAnimeID]) {
    					clearTimeout(videoLoops[loopedAnimeID]);
    					videoLoops[loopedAnimeID] = null;
    				}

    				videoLoops[loopedAnimeID] = setTimeout(
    					() => {
    						_ytPlayer?.stopVideo?.();

    						setTimeout(
    							() => {
    								if (mostVisiblePopupHeader === popupHeader && _ytPlayer?.getPlayerState?.() === 5 && _ytPlayer.g && $inApp && $popupVisible && $autoPlay) {
    									_ytPlayer?.playVideo?.();
    								}
    							},
    							5000
    						);
    					},
    					7 * 1000
    				); // Play Again after 8 seconds
    			}
    		} else if (videoLoops[loopedAnimeID]) {
    			clearTimeout(videoLoops[loopedAnimeID]);
    			videoLoops[loopedAnimeID] = null;
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
    				200
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
    					200
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

    	async function updateList(event) {
    		if (await $confirmPromise({
    			title: "List has an update",
    			text: "Do you want to refresh your list?"
    		})) {
    			set_store_value(listIsUpdating, $listIsUpdating = true, $listIsUpdating);

    			if ($animeLoaderWorker) {
    				$animeLoaderWorker.terminate();
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    			}

    			animeLoader$1().then(async data => {
    				set_store_value(listUpdateAvailable, $listUpdateAvailable = false, $listUpdateAvailable);
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);

    				if (data?.isNew) {
    					if ($finalAnimeList instanceof Array) {
    						set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    					}

    					data?.finalAnimeList?.forEach?.((anime, idx) => {
    						set_store_value(
    							newFinalAnime,
    							$newFinalAnime = {
    								id: anime.id,
    								idx: data.shownAnimeListCount + idx,
    								finalAnimeList: anime
    							},
    							$newFinalAnime
    						);
    					});

    					set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries || $hiddenEntries, $hiddenEntries);
    				}

    				set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    				return;
    			}).catch(error => {
    				console.error(error);
    			});
    		}
    	}

    	function getFormattedAnimeFormat({ episodes, nextAiringEpisode }) {
    		let text;
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
    			text = ` · <span style="color:rgb(61, 180, 242);">${nextEpisode}/${episodes} in ${formatDateDifference(nextAiringDate, timeDifMS)}</span>`;
    		} else if (timeDifMS > 0 && typeof nextEpisode === "number") {
    			text = ` · <span style="color:rgb(61, 180, 242);">Ep ${nextEpisode} in ${formatDateDifference(nextAiringDate, timeDifMS)}</span>`;
    		} else if (timeDifMS <= 0 && typeof nextEpisode === "number" && episodes > nextEpisode) {
    			text = ` · ${nextEpisode}/${episodes}`;
    		} else if (episodes > 0) {
    			text = ` · ${episodes}`;
    		}

    		return text;
    	}

    	function formatDateDifference(endDate, timeDifference) {
    		const oneMinute = 60 * 1000;
    		const oneHour = 60 * oneMinute;
    		const oneDay = 24 * oneHour;
    		const oneWeek = 7 * oneDay;
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

    		set_store_value(dataStatus, $dataStatus = "Currently Offline", $dataStatus);
    		isOnline = false;
    	});

    	let touchID,
    		checkPointer,
    		startX,
    		endX,
    		startY,
    		endY,
    		goBackPercent,
    		itemIsScrolling,
    		itemIsScrollingTimeout;

    	function popupScroll() {
    		$$invalidate(7, itemIsScrolling = true);
    		clearTimeout(itemIsScrollingTimeout);

    		itemIsScrollingTimeout = setTimeout(
    			() => {
    				$$invalidate(7, itemIsScrolling = false);
    			},
    			50
    		);

    		set_store_value(popupIsGoingBack, $popupIsGoingBack = false, $popupIsGoingBack);
    		$$invalidate(6, goBackPercent = 0);
    	}

    	function itemScroll() {
    		$$invalidate(7, itemIsScrolling = true);
    		clearTimeout(itemIsScrollingTimeout);

    		itemIsScrollingTimeout = setTimeout(
    			() => {
    				$$invalidate(7, itemIsScrolling = false);
    			},
    			500
    		);
    	}

    	function handlePopupContainerDown(event) {
    		if (itemIsScrolling) return;
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
    				$$invalidate(6, goBackPercent = Math.min(deltaX / 48 * 100, 100));
    			} else {
    				$$invalidate(6, goBackPercent = 0);
    			}
    		}
    	}

    	function handlePopupContainerUp(event) {
    		if ($popupIsGoingBack) {
    			endX = Array.from(event.changedTouches)?.find(touch => touch.identifier === touchID)?.clientX;

    			if (typeof endX === "number") {
    				let xThreshold = 48;
    				let deltaX = endX - startX;

    				if ($popupIsGoingBack && deltaX >= xThreshold) {
    					set_store_value(popupVisible, $popupVisible = false, $popupVisible);
    				}
    			}

    			touchID = null;
    			set_store_value(popupIsGoingBack, $popupIsGoingBack = false, $popupIsGoingBack);
    			$$invalidate(6, goBackPercent = 0);
    		} else {
    			touchID = null;
    			set_store_value(popupIsGoingBack, $popupIsGoingBack = false, $popupIsGoingBack);
    			$$invalidate(6, goBackPercent = 0);
    		}
    	}

    	function handlePopupContainerCancel() {
    		touchID = null;
    		set_store_value(popupIsGoingBack, $popupIsGoingBack = false, $popupIsGoingBack);
    		$$invalidate(6, goBackPercent = 0);
    	}

    	let fvTouchId,
    		fvStartY,
    		fvStartX,
    		fvIsScrolled,
    		fvIsScrolledTopMax,
    		fvIsScrolledBottomMax;

    	function fullViewScroll() {
    		fvIsScrolled = true;
    	}

    	function fullViewTouchStart(e) {
    		if (!popupContainer) return;
    		let element = e.target;
    		let closestScrollableYElement = element;

    		while (closestScrollableYElement && closestScrollableYElement !== document.body) {
    			fvIsScrolledTopMax = element.scrollTop < 1;
    			fvIsScrolledBottomMax = Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) < 1;
    			let isScrolledYMax = fvIsScrolledTopMax || fvIsScrolledBottomMax;

    			if (isScrolledYMax) {
    				break;
    			}

    			closestScrollableYElement = closestScrollableYElement?.parentElement;
    		}

    		fvTouchId = e?.touches?.[0]?.identifier;
    		fvStartY = e?.touches?.[0]?.clientY;
    		fvStartX = e?.touches?.[0]?.clientX;
    	}

    	function fullViewTouchEnd(e) {
    		if (!fvIsScrolled) {
    			let endY = Array.from(e?.changedTouches || [])?.find(touch => touch?.identifier === fvTouchId)?.clientY;
    			let endX = Array.from(e?.changedTouches || [])?.find(touch => touch?.identifier === fvTouchId)?.clientX;
    			let deltaY = endY - fvStartY;
    			let deltaX = endX - fvStartX;

    			if (typeof deltaY === "number" && !isNaN(deltaY) && typeof deltaX === "number" && !isNaN(deltaX)) {
    				let canGoBack = Math.abs(deltaX) > Math.abs(deltaY) || deltaY < 0 && fvIsScrolledBottomMax || deltaY > 0 && fvIsScrolledTopMax;

    				if (canGoBack) {
    					$$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));
    				}
    			}
    		}

    		fullViewTouchCancel();
    	}

    	function fullViewTouchCancel() {
    		fvTouchId = fvStartY = fvStartX = fvIsScrolled = fvIsScrolledTopMax = fvIsScrolledBottomMax = false;
    	}

    	function showFullScreenInfo(info) {
    		if (!info) return;
    		window.setShouldGoBack(false);
    		$$invalidate(1, fullDescriptionPopup = editHTMLString(info));
    		$$invalidate(0, fullImagePopup = null);
    	}

    	window.showFullScreenInfo = showFullScreenInfo;

    	window.checkOpenFullScreenItem = () => {
    		return fullImagePopup || fullDescriptionPopup;
    	};

    	window.closeFullScreenItem = () => {
    		if (fullImagePopup) {
    			$$invalidate(0, fullImagePopup = null);
    		} else {
    			$$invalidate(1, fullDescriptionPopup = null);
    		}
    	};

    	async function addImage(node, imageUrl) {
    		if (imageUrl && imageUrl !== emptyImage) {
    			node.src = imageUrl;
    			let newImageUrl = await cacheImage(imageUrl);

    			if (newImageUrl) {
    				node.src = newImageUrl;
    			}
    		} else {
    			node.src = emptyImage;
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$5.warn(`<AnimePopup> was created with unknown prop '${key}'`);
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

    	function div2_binding($$value, each_value, anime_index) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			each_value[anime_index].popupHeader = $$value;
    		});
    	}

    	const click_handler = anime => askToOpenYoutube(anime.title);
    	const keydown_handler = (anime, e) => e.key === "Enter" && askToOpenYoutube(anime.title);

    	function input_change_handler() {
    		$autoPlay = this.checked;
    		autoPlay.set($autoPlay);
    	}

    	const keydown_handler_1 = e => e.key === "Enter" && (() => set_store_value(autoPlay, $autoPlay = !$autoPlay, $autoPlay))();

    	const click_handler_1 = () => {
    		set_store_value(autoPlay, $autoPlay = !$autoPlay, $autoPlay);
    	};

    	const keydown_handler_2 = e => {
    		if (e.key === "Enter") {
    			set_store_value(autoPlay, $autoPlay = !$autoPlay, $autoPlay);
    		}
    	};

    	const keydown_handler_3 = e => e.key === "Enter" && updateList();

    	const click_handler_2 = anime => {
    		window.setShouldGoBack(false);
    		$$invalidate(0, fullImagePopup = anime.bannerImageUrl || anime.trailerThumbnailUrl);
    		$$invalidate(1, fullDescriptionPopup = null);
    	};

    	const keydown_handler_4 = (anime, e) => {
    		if (e.key === "Enter") {
    			window.setShouldGoBack(false);
    			$$invalidate(0, fullImagePopup = anime.bannerImageUrl || anime.trailerThumbnailUrl);
    			$$invalidate(1, fullDescriptionPopup = null);
    		}
    	};

    	const mouseenter_handler = (anime, each_value, anime_index, e) => {
    		if (!anime?.hasStudioDragScroll) {
    			let info = e?.target?.closest?.(".info") || e?.target;

    			if (info) {
    				set_store_value(finalAnimeList, each_value[anime_index].hasStudioDragScroll = true, $finalAnimeList);
    				dragScroll(info, "x");
    			}
    		}
    	};

    	const mouseenter_handler_1 = (anime, each_value, anime_index, e) => {
    		if (!anime?.hasGenreDragScroll) {
    			let info = e?.target?.closest?.(".info") || e?.target;

    			if (info) {
    				set_store_value(finalAnimeList, each_value[anime_index].hasGenreDragScroll = true, $finalAnimeList);
    				dragScroll(info, "x");
    			}
    		}
    	};

    	const click_handler_3 = tags => {
    		if (!itemIsScrolling) {
    			showFullScreenInfo(window?.getTagInfoHTML?.(cleanText$1(tags?.tagName)));
    		}
    	};

    	const keydown_handler_5 = (tags, e) => {
    		if (e.key === "Enter" && !itemIsScrolling) {
    			showFullScreenInfo(window?.getTagInfoHTML?.(cleanText$1(tags?.tagName)));
    		}
    	};

    	const mouseenter_handler_2 = (anime, each_value, anime_index, e) => {
    		if (!anime?.hasTagDragScroll) {
    			let info = e?.target?.closest?.(".info") || e?.target;

    			if (info) {
    				set_store_value(finalAnimeList, each_value[anime_index].hasTagDragScroll = true, $finalAnimeList);
    				dragScroll(info, "x");
    			}
    		}
    	};

    	const error_handler_1 = e => {
    		addClass(e.target, "display-none");
    	};

    	const click_handler_4 = anime => {
    		window.setShouldGoBack(false);
    		$$invalidate(0, fullImagePopup = anime.coverImageUrl || anime.bannerImageUrl || anime.trailerThumbnailUrl || emptyImage);
    		$$invalidate(1, fullDescriptionPopup = null);
    	};

    	const keydown_handler_6 = (anime, e) => {
    		window.setShouldGoBack(false);

    		if (e.key === "Enter") {
    			$$invalidate(0, fullImagePopup = anime.coverImageUrl || anime.bannerImageUrl || anime.trailerThumbnailUrl || emptyImage);
    			$$invalidate(1, fullDescriptionPopup = null);
    		}
    	};

    	const click_handler_5 = anime => showFullScreenInfo(anime?.description);
    	const keydown_handler_7 = (anime, e) => e.key === "Enter" && showFullScreenInfo(anime?.description);

    	function div11_binding($$value, each_value, anime_index) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			each_value[anime_index].popupInfo = $$value;
    		});
    	}

    	const keydown_handler_8 = (anime, e) => e.key === "Enter" && handleHideShow(anime.id, anime?.shownTitle);
    	const keydown_handler_9 = (anime, e) => e.key === "Enter" && handleMoreVideos(anime.title);

    	const click_handler_6 = anime => {
    		openInAnilist(anime.animeUrl);
    	};

    	const keydown_handler_10 = (anime, e) => e.key === "Enter" && openInAnilist(anime.animeUrl);

    	function div15_binding($$value, each_value, anime_index) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			each_value[anime_index].popupContent = $$value;
    		});
    	}

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			popupContainer = $$value;
    			$$invalidate(3, popupContainer);
    		});
    	}

    	const keydown_handler_11 = e => e.key === "Enter" && handlePopupVisibility(e);

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			popupWrapper = $$value;
    			$$invalidate(2, popupWrapper);
    		});
    	}

    	const keydown_handler_12 = e => e.key === "Enter" && $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));
    	const click_handler_7 = () => $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));
    	const keydown_handler_13 = e => e.key === "Enter" && $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));
    	const keydown_handler_14 = e => e.key === "Enter" && $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));

    	const error_handler_2 = e => {
    		addClass(e.target, "display-none");
    	};

    	const click_handler_8 = () => $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));
    	const keydown_handler_15 = e => e.key === "Enter" && $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		fade,
    		finalAnimeList,
    		animeLoaderWorker: animeLoaderWorker$1,
    		hiddenEntries,
    		ytPlayers,
    		autoPlay,
    		animeObserver,
    		popupVisible,
    		openedAnimePopupIdx,
    		android: android$1,
    		inApp,
    		confirmPromise,
    		animeIdxRemoved,
    		shownAllInList,
    		dataStatus,
    		initData,
    		updateRecommendationList,
    		listUpdateAvailable,
    		checkAnimeLoaderStatus,
    		popupIsGoingBack,
    		earlisetReleaseDate,
    		listIsUpdating,
    		isFullViewed,
    		newFinalAnime,
    		isJsonObject,
    		scrollToElement,
    		getChildIndex,
    		msToTime,
    		isElementVisible,
    		addClass,
    		removeClass,
    		getMostVisibleElement,
    		dragScroll,
    		retrieveJSON,
    		saveJSON,
    		animeLoader: animeLoader$1,
    		cacheImage,
    		emptyImage,
    		isOnline,
    		animeGridParentEl,
    		mostVisiblePopupHeader,
    		currentHeaderIdx,
    		currentYtPlayer,
    		popupWrapper,
    		popupContainer,
    		popupAnimeObserver,
    		fullImagePopup,
    		fullDescriptionPopup,
    		windowWidth,
    		windowHeight,
    		videoLoops,
    		savedYtVolume,
    		addPopupObserver,
    		handlePopupVisibility,
    		handleHideShow,
    		pleaseWaitAlert,
    		askToOpenYoutube,
    		handleMoreVideos,
    		openInAnilist,
    		scrollToGridTimeout,
    		createPopupPlayersTimeout,
    		playMostVisibleTrailer,
    		failingTrailers,
    		createPopupYTPlayer,
    		onPlayerError,
    		onPlayerStateChange,
    		onPlayerReady,
    		prePlayYtPlayer,
    		updateList,
    		getFormattedAnimeFormat,
    		formatDateDifference,
    		isCurrentlyPlaying,
    		reloadYoutube,
    		loadYouTubeAPI,
    		editHTMLString,
    		touchID,
    		checkPointer,
    		startX,
    		endX,
    		startY,
    		endY,
    		goBackPercent,
    		itemIsScrolling,
    		itemIsScrollingTimeout,
    		popupScroll,
    		itemScroll,
    		handlePopupContainerDown,
    		handlePopupContainerMove,
    		handlePopupContainerUp,
    		handlePopupContainerCancel,
    		fvTouchId,
    		fvStartY,
    		fvStartX,
    		fvIsScrolled,
    		fvIsScrolledTopMax,
    		fvIsScrolledBottomMax,
    		fullViewScroll,
    		fullViewTouchStart,
    		fullViewTouchEnd,
    		fullViewTouchCancel,
    		showFullScreenInfo,
    		addImage,
    		cleanText: cleanText$1,
    		$isFullViewed,
    		$android,
    		$popupIsGoingBack,
    		$popupVisible,
    		$dataStatus,
    		$ytPlayers,
    		$updateRecommendationList,
    		$finalAnimeList,
    		$autoPlay,
    		$inApp,
    		$initData,
    		$hiddenEntries,
    		$newFinalAnime,
    		$animeLoaderWorker,
    		$listUpdateAvailable,
    		$listIsUpdating,
    		$confirmPromise,
    		$animeObserver,
    		$openedAnimePopupIdx,
    		$checkAnimeLoaderStatus,
    		$earlisetReleaseDate,
    		$shownAllInList
    	});

    	$$self.$inject_state = $$props => {
    		if ('isOnline' in $$props) isOnline = $$props.isOnline;
    		if ('animeGridParentEl' in $$props) animeGridParentEl = $$props.animeGridParentEl;
    		if ('mostVisiblePopupHeader' in $$props) mostVisiblePopupHeader = $$props.mostVisiblePopupHeader;
    		if ('currentHeaderIdx' in $$props) currentHeaderIdx = $$props.currentHeaderIdx;
    		if ('currentYtPlayer' in $$props) currentYtPlayer = $$props.currentYtPlayer;
    		if ('popupWrapper' in $$props) $$invalidate(2, popupWrapper = $$props.popupWrapper);
    		if ('popupContainer' in $$props) $$invalidate(3, popupContainer = $$props.popupContainer);
    		if ('popupAnimeObserver' in $$props) popupAnimeObserver = $$props.popupAnimeObserver;
    		if ('fullImagePopup' in $$props) $$invalidate(0, fullImagePopup = $$props.fullImagePopup);
    		if ('fullDescriptionPopup' in $$props) $$invalidate(1, fullDescriptionPopup = $$props.fullDescriptionPopup);
    		if ('windowWidth' in $$props) $$invalidate(4, windowWidth = $$props.windowWidth);
    		if ('windowHeight' in $$props) $$invalidate(5, windowHeight = $$props.windowHeight);
    		if ('videoLoops' in $$props) videoLoops = $$props.videoLoops;
    		if ('savedYtVolume' in $$props) savedYtVolume = $$props.savedYtVolume;
    		if ('scrollToGridTimeout' in $$props) scrollToGridTimeout = $$props.scrollToGridTimeout;
    		if ('createPopupPlayersTimeout' in $$props) createPopupPlayersTimeout = $$props.createPopupPlayersTimeout;
    		if ('failingTrailers' in $$props) failingTrailers = $$props.failingTrailers;
    		if ('isCurrentlyPlaying' in $$props) isCurrentlyPlaying = $$props.isCurrentlyPlaying;
    		if ('touchID' in $$props) touchID = $$props.touchID;
    		if ('checkPointer' in $$props) checkPointer = $$props.checkPointer;
    		if ('startX' in $$props) startX = $$props.startX;
    		if ('endX' in $$props) endX = $$props.endX;
    		if ('startY' in $$props) startY = $$props.startY;
    		if ('endY' in $$props) endY = $$props.endY;
    		if ('goBackPercent' in $$props) $$invalidate(6, goBackPercent = $$props.goBackPercent);
    		if ('itemIsScrolling' in $$props) $$invalidate(7, itemIsScrolling = $$props.itemIsScrolling);
    		if ('itemIsScrollingTimeout' in $$props) itemIsScrollingTimeout = $$props.itemIsScrollingTimeout;
    		if ('fvTouchId' in $$props) fvTouchId = $$props.fvTouchId;
    		if ('fvStartY' in $$props) fvStartY = $$props.fvStartY;
    		if ('fvStartX' in $$props) fvStartX = $$props.fvStartX;
    		if ('fvIsScrolled' in $$props) fvIsScrolled = $$props.fvIsScrolled;
    		if ('fvIsScrolledTopMax' in $$props) fvIsScrolledTopMax = $$props.fvIsScrolledTopMax;
    		if ('fvIsScrolledBottomMax' in $$props) fvIsScrolledBottomMax = $$props.fvIsScrolledBottomMax;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*fullDescriptionPopup, fullImagePopup*/ 3 | $$self.$$.dirty[1] & /*$android*/ 16) {
    			{
    				if ($android || !matchMedia("(hover:hover)").matches) {
    					fullDescriptionPopup || fullImagePopup
    					? addClass(document.documentElement, "overflow-hidden")
    					: removeClass(document.documentElement, "overflow-hidden");
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*fullDescriptionPopup, fullImagePopup*/ 3) {
    			set_store_value(isFullViewed, $isFullViewed = Boolean(fullDescriptionPopup || fullImagePopup), $isFullViewed);
    		}
    	};

    	return [
    		fullImagePopup,
    		fullDescriptionPopup,
    		popupWrapper,
    		popupContainer,
    		windowWidth,
    		windowHeight,
    		goBackPercent,
    		itemIsScrolling,
    		$popupIsGoingBack,
    		$popupVisible,
    		$finalAnimeList,
    		$autoPlay,
    		$hiddenEntries,
    		$listUpdateAvailable,
    		$listIsUpdating,
    		$earlisetReleaseDate,
    		$shownAllInList,
    		handlePopupVisibility,
    		handleHideShow,
    		askToOpenYoutube,
    		handleMoreVideos,
    		updateList,
    		getFormattedAnimeFormat,
    		popupScroll,
    		itemScroll,
    		handlePopupContainerDown,
    		handlePopupContainerMove,
    		handlePopupContainerUp,
    		handlePopupContainerCancel,
    		fullViewScroll,
    		fullViewTouchStart,
    		fullViewTouchEnd,
    		fullViewTouchCancel,
    		showFullScreenInfo,
    		addImage,
    		$android,
    		load_handler,
    		error_handler,
    		div2_binding,
    		click_handler,
    		keydown_handler,
    		input_change_handler,
    		keydown_handler_1,
    		click_handler_1,
    		keydown_handler_2,
    		keydown_handler_3,
    		click_handler_2,
    		keydown_handler_4,
    		mouseenter_handler,
    		mouseenter_handler_1,
    		click_handler_3,
    		keydown_handler_5,
    		mouseenter_handler_2,
    		error_handler_1,
    		click_handler_4,
    		keydown_handler_6,
    		click_handler_5,
    		keydown_handler_7,
    		div11_binding,
    		keydown_handler_8,
    		keydown_handler_9,
    		click_handler_6,
    		keydown_handler_10,
    		div15_binding,
    		div0_binding,
    		keydown_handler_11,
    		div1_binding,
    		keydown_handler_12,
    		click_handler_7,
    		keydown_handler_13,
    		keydown_handler_14,
    		error_handler_2,
    		click_handler_8,
    		keydown_handler_15
    	];
    }

    class AnimePopup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {}, null, [-1, -1, -1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AnimePopup",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\components\Anime\Fixed\AnimeOptionsPopup.svelte generated by Svelte v3.59.1 */
    const file$6 = "src\\components\\Anime\\Fixed\\AnimeOptionsPopup.svelte";

    // (200:0) {#if $animeOptionVisible && !$popupVisible && $finalAnimeList}
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
    	let t10;
    	let span4;
    	let h23;

    	let t11_value = (!/*$hiddenEntries*/ ctx[5]
    	? "Please Wait..."
    	: /*$hiddenEntries*/ ctx[5][/*animeID*/ ctx[2]]
    		? "Show"
    		: "Hide" + " Anime") + "";

    	let t11;
    	let div2_outro;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*animeCopyTitle*/ ctx[1] && create_if_block_1$3(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			h1 = element("h1");
    			t0 = text(/*shownTitle*/ ctx[0]);
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
    			if (if_block) if_block.c();
    			t10 = space();
    			span4 = element("span");
    			h23 = element("h2");
    			t11 = text(t11_value);
    			attr_dev(h1, "class", "svelte-1wt0ioq");
    			add_location(h1, file$6, 209, 42, 7491);
    			attr_dev(span0, "class", "anime-title svelte-1wt0ioq");
    			add_location(span0, file$6, 209, 16, 7465);
    			attr_dev(div0, "class", "closing-x svelte-1wt0ioq");
    			attr_dev(div0, "tabindex", "0");
    			add_location(div0, file$6, 211, 16, 7609);
    			attr_dev(div1, "class", "option-header svelte-1wt0ioq");
    			add_location(div1, file$6, 208, 12, 7420);
    			attr_dev(h20, "class", "option-title svelte-1wt0ioq");
    			add_location(h20, file$6, 225, 17, 8150);
    			attr_dev(span1, "class", "anime-option svelte-1wt0ioq");
    			add_location(span1, file$6, 221, 12, 7969);
    			attr_dev(h21, "class", "option-title svelte-1wt0ioq");
    			add_location(h21, file$6, 231, 17, 8405);
    			attr_dev(span2, "class", "anime-option svelte-1wt0ioq");
    			add_location(span2, file$6, 227, 12, 8226);
    			attr_dev(h22, "class", "option-title svelte-1wt0ioq");
    			add_location(h22, file$6, 237, 17, 8664);
    			attr_dev(span3, "class", "anime-option svelte-1wt0ioq");
    			add_location(span3, file$6, 233, 12, 8485);
    			attr_dev(h23, "class", "option-title svelte-1wt0ioq");
    			add_location(h23, file$6, 251, 17, 9248);
    			attr_dev(span4, "class", "anime-option svelte-1wt0ioq");
    			add_location(span4, file$6, 247, 12, 9067);
    			attr_dev(div2, "class", "anime-options-container svelte-1wt0ioq");
    			add_location(div2, file$6, 207, 8, 7340);
    			attr_dev(div3, "class", "anime-options svelte-1wt0ioq");
    			add_location(div3, file$6, 200, 4, 7066);
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
    			if (if_block) if_block.m(div2, null);
    			append_dev(div2, t10);
    			append_dev(div2, span4);
    			append_dev(span4, h23);
    			append_dev(h23, t11);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*handleAnimeOptionVisibility*/ ctx[8], false, false, false, false),
    					listen_dev(div0, "keydown", /*keydown_handler*/ ctx[15], false, false, false, false),
    					listen_dev(span1, "click", /*openAnimePopup*/ ctx[9], false, false, false, false),
    					listen_dev(span1, "keydown", /*keydown_handler_1*/ ctx[16], false, false, false, false),
    					listen_dev(span2, "click", /*openInAnilist*/ ctx[10], false, false, false, false),
    					listen_dev(span2, "keydown", /*keydown_handler_2*/ ctx[17], false, false, false, false),
    					listen_dev(span3, "click", /*openInYoutube*/ ctx[11], false, false, false, false),
    					listen_dev(span3, "keydown", /*keydown_handler_3*/ ctx[18], false, false, false, false),
    					listen_dev(span4, "click", /*handleHideShow*/ ctx[13], false, false, false, false),
    					listen_dev(span4, "keydown", /*keydown_handler_5*/ ctx[20], false, false, false, false),
    					action_destroyer(/*loadAnimeOption*/ ctx[14].call(null, div3)),
    					listen_dev(div3, "click", /*handleAnimeOptionVisibility*/ ctx[8], false, false, false, false),
    					listen_dev(div3, "touchend", /*handleTouchAnimeOptionVisibility*/ ctx[7], { passive: true }, false, false, false),
    					listen_dev(div3, "keydown", /*keydown_handler_6*/ ctx[21], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*shownTitle*/ 1) set_data_dev(t0, /*shownTitle*/ ctx[0]);

    			if (/*animeCopyTitle*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$3(ctx);
    					if_block.c();
    					if_block.m(div2, t10);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((!current || dirty[0] & /*$hiddenEntries, animeID*/ 36) && t11_value !== (t11_value = (!/*$hiddenEntries*/ ctx[5]
    			? "Please Wait..."
    			: /*$hiddenEntries*/ ctx[5][/*animeID*/ ctx[2]]
    				? "Show"
    				: "Hide" + " Anime") + "")) set_data_dev(t11, t11_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (div2_outro) div2_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			div2_outro = create_out_transition(div2, fade, { duration: 200 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block) if_block.d();
    			if (detaching && div2_outro) div2_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(200:0) {#if $animeOptionVisible && !$popupVisible && $finalAnimeList}",
    		ctx
    	});

    	return block;
    }

    // (240:12) {#if animeCopyTitle}
    function create_if_block_1$3(ctx) {
    	let span;
    	let h2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element("span");
    			h2 = element("h2");
    			h2.textContent = "Copy Title";
    			attr_dev(h2, "class", "option-title svelte-1wt0ioq");
    			add_location(h2, file$6, 244, 21, 8969);
    			attr_dev(span, "class", "anime-option svelte-1wt0ioq");
    			add_location(span, file$6, 240, 16, 8782);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, h2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(span, "click", /*copyTitle*/ ctx[12], false, false, false, false),
    					listen_dev(span, "keydown", /*keydown_handler_4*/ ctx[19], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(240:12) {#if animeCopyTitle}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$animeOptionVisible*/ ctx[3] && !/*$popupVisible*/ ctx[6] && /*$finalAnimeList*/ ctx[4] && create_if_block$4(ctx);

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
    		p: function update(ctx, dirty) {
    			if (/*$animeOptionVisible*/ ctx[3] && !/*$popupVisible*/ ctx[6] && /*$finalAnimeList*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*$animeOptionVisible, $popupVisible, $finalAnimeList*/ 88) {
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $animeOptionVisible;
    	let $openedAnimeOptionIdx;
    	let $finalAnimeList;
    	let $confirmPromise;
    	let $hiddenEntries;
    	let $animeLoaderWorker;
    	let $checkAnimeLoaderStatus;
    	let $android;
    	let $popupVisible;
    	let $openedAnimePopupIdx;
    	validate_store(animeOptionVisible, 'animeOptionVisible');
    	component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(3, $animeOptionVisible = $$value));
    	validate_store(openedAnimeOptionIdx, 'openedAnimeOptionIdx');
    	component_subscribe($$self, openedAnimeOptionIdx, $$value => $$invalidate(27, $openedAnimeOptionIdx = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(4, $finalAnimeList = $$value));
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(28, $confirmPromise = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(5, $hiddenEntries = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(29, $animeLoaderWorker = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(30, $checkAnimeLoaderStatus = $$value));
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(31, $android = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(6, $popupVisible = $$value));
    	validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
    	component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(32, $openedAnimePopupIdx = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AnimeOptionsPopup', slots, []);
    	let shownTitle;
    	let youtubeSearchTitle;
    	let animeCopyTitle;
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
    				100
    			);
    		} else {
    			if (isRecentlyOpenedTimeout) clearTimeout(isRecentlyOpenedTimeout);
    			isRecentlyOpened = false;
    		}
    	});

    	function handleTouchAnimeOptionVisibility(e) {
    		if (isRecentlyOpened) return;
    		let target = e.target;
    		let classList = target.classList;
    		if (target.closest(".anime-options-container") || classList.contains("anime-options-container")) return;
    		set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    	}

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
    		window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchTitle + " Anime")}`, "_blank");
    	}

    	function copyTitle(e) {
    		if (isRecentlyOpened && e.type !== "keydown" || !animeCopyTitle) return;

    		if ($android) {
    			try {
    				JSBridge.copyToClipBoard(shownTitle);
    				JSBridge.copyToClipBoard(animeCopyTitle);
    			} catch(ex) {
    				
    			}
    		} else {
    			if (shownTitle && !ncsCompare(animeCopyTitle, shownTitle)) {
    				navigator?.clipboard?.writeText?.(shownTitle);

    				setTimeout(
    					() => {
    						navigator?.clipboard?.writeText?.(animeCopyTitle);
    					},
    					300
    				);
    			} else {
    				navigator?.clipboard?.writeText?.(animeCopyTitle);
    			}
    		}

    		set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    	}

    	async function handleHideShow(e) {
    		if (isRecentlyOpened && e.type !== "keydown") return;
    		if (!$hiddenEntries) return pleaseWaitAlert();

    		let title = shownTitle
    		? `<span style="color:#00cbf9;">${shownTitle}</span>`
    		: "this anime";

    		let isHidden = $hiddenEntries[animeID];

    		if (isHidden) {
    			if (await $confirmPromise(`Do you want to unhide ${title} in your recommendation list?`)) {
    				$checkAnimeLoaderStatus().then(async () => {
    					delete $hiddenEntries[animeID];

    					if ($finalAnimeList.length) {
    						if ($animeLoaderWorker instanceof Worker) {
    							$animeLoaderWorker?.postMessage?.({
    								removeID: animeID,
    								hiddenEntries: $hiddenEntries
    							});
    						}
    					}
    				}).catch(() => {
    					$confirmPromise({
    						isAlert: true,
    						title: "Something went wrong",
    						text: "Failed to unhide the anime, please try again."
    					});
    				});

    				set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    			}
    		} else {
    			if (await $confirmPromise(`Do you want to hide ${title} in your recommendation list?`)) {
    				$checkAnimeLoaderStatus().then(async () => {
    					set_store_value(hiddenEntries, $hiddenEntries[animeID] = true, $hiddenEntries);

    					if ($finalAnimeList.length) {
    						if ($animeLoaderWorker instanceof Worker) {
    							$animeLoaderWorker?.postMessage?.({
    								removeID: animeID,
    								hiddenEntries: $hiddenEntries
    							});
    						}
    					}
    				}).catch(() => {
    					$confirmPromise({
    						isAlert: true,
    						title: "Something went wrong",
    						text: "Failed to hide the anime, please try again."
    					});
    				});

    				set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    			}
    		}
    	}

    	async function pleaseWaitAlert() {
    		return await $confirmPromise({
    			isAlert: true,
    			title: "Initializing resources",
    			text: "Please wait a moment..."
    		});
    	}

    	function loadAnimeOption() {
    		let openedAnime = $finalAnimeList?.[$openedAnimeOptionIdx ?? -1];

    		if (openedAnime) {
    			$$invalidate(0, shownTitle = openedAnime?.shownTitle);
    			$$invalidate(1, animeCopyTitle = youtubeSearchTitle = openedAnime?.copiedTitle);
    			$$invalidate(2, animeID = openedAnime.id);
    			animeUrl = openedAnime.animeUrl;
    			animeIdx = $openedAnimeOptionIdx;
    		} else {
    			set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    		}
    	}

    	finalAnimeList.subscribe(() => {
    		if ($animeOptionVisible) {
    			loadAnimeOption();
    		}
    	});

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
    		fade,
    		android: android$1,
    		animeOptionVisible,
    		openedAnimeOptionIdx,
    		finalAnimeList,
    		popupVisible,
    		openedAnimePopupIdx,
    		hiddenEntries,
    		animeLoaderWorker: animeLoaderWorker$1,
    		confirmPromise,
    		checkAnimeLoaderStatus,
    		ncsCompare,
    		shownTitle,
    		youtubeSearchTitle,
    		animeCopyTitle,
    		animeID,
    		animeUrl,
    		animeIdx,
    		isRecentlyOpened,
    		isRecentlyOpenedTimeout,
    		handleTouchAnimeOptionVisibility,
    		handleAnimeOptionVisibility,
    		openAnimePopup,
    		openInAnilist,
    		openInYoutube,
    		copyTitle,
    		handleHideShow,
    		pleaseWaitAlert,
    		loadAnimeOption,
    		$animeOptionVisible,
    		$openedAnimeOptionIdx,
    		$finalAnimeList,
    		$confirmPromise,
    		$hiddenEntries,
    		$animeLoaderWorker,
    		$checkAnimeLoaderStatus,
    		$android,
    		$popupVisible,
    		$openedAnimePopupIdx
    	});

    	$$self.$inject_state = $$props => {
    		if ('shownTitle' in $$props) $$invalidate(0, shownTitle = $$props.shownTitle);
    		if ('youtubeSearchTitle' in $$props) youtubeSearchTitle = $$props.youtubeSearchTitle;
    		if ('animeCopyTitle' in $$props) $$invalidate(1, animeCopyTitle = $$props.animeCopyTitle);
    		if ('animeID' in $$props) $$invalidate(2, animeID = $$props.animeID);
    		if ('animeUrl' in $$props) animeUrl = $$props.animeUrl;
    		if ('animeIdx' in $$props) animeIdx = $$props.animeIdx;
    		if ('isRecentlyOpened' in $$props) isRecentlyOpened = $$props.isRecentlyOpened;
    		if ('isRecentlyOpenedTimeout' in $$props) isRecentlyOpenedTimeout = $$props.isRecentlyOpenedTimeout;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		shownTitle,
    		animeCopyTitle,
    		animeID,
    		$animeOptionVisible,
    		$finalAnimeList,
    		$hiddenEntries,
    		$popupVisible,
    		handleTouchAnimeOptionVisibility,
    		handleAnimeOptionVisibility,
    		openAnimePopup,
    		openInAnilist,
    		openInYoutube,
    		copyTitle,
    		handleHideShow,
    		loadAnimeOption,
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AnimeOptionsPopup",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\components\Fixed\CustomFilter.svelte generated by Svelte v3.59.1 */

    const { console: console_1$4 } = globals;
    const file$5 = "src\\components\\Fixed\\CustomFilter.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[59] = list[i];
    	return child_ctx;
    }

    // (420:8) {#each $customFilters as filterName (filterName || {}
    function create_each_block$1(key_1, ctx) {
    	let span;
    	let t0_value = (trimAllEmptyChar(/*filterName*/ ctx[59]) || "") + "";
    	let t0;
    	let t1;
    	let span_custom_filter_name_value;
    	let span_class_value;
    	let mounted;
    	let dispose;

    	function keydown_handler_2(...args) {
    		return /*keydown_handler_2*/ ctx[23](/*filterName*/ ctx[59], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(span, "tabindex", "0");
    			attr_dev(span, "custom-filter-name", span_custom_filter_name_value = /*filterName*/ ctx[59]);

    			attr_dev(span, "class", span_class_value = "" + (null_to_empty("custom-filter" + (/*filterName*/ ctx[59] === /*$selectedCustomFilter*/ ctx[10]
    			? " selected"
    			: "")) + " svelte-12t7idl"));

    			add_location(span, file$5, 420, 12, 14804);
    			this.first = span;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						span,
    						"click",
    						function () {
    							if (is_function(/*selectCustomFilter*/ ctx[13](/*filterName*/ ctx[59]))) /*selectCustomFilter*/ ctx[13](/*filterName*/ ctx[59]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(span, "keydown", keydown_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$customFilters*/ 8 && t0_value !== (t0_value = (trimAllEmptyChar(/*filterName*/ ctx[59]) || "") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$customFilters*/ 8 && span_custom_filter_name_value !== (span_custom_filter_name_value = /*filterName*/ ctx[59])) {
    				attr_dev(span, "custom-filter-name", span_custom_filter_name_value);
    			}

    			if (dirty[0] & /*$customFilters, $selectedCustomFilter*/ 1032 && span_class_value !== (span_class_value = "" + (null_to_empty("custom-filter" + (/*filterName*/ ctx[59] === /*$selectedCustomFilter*/ ctx[10]
    			? " selected"
    			: "")) + " svelte-12t7idl"))) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(420:8) {#each $customFilters as filterName (filterName || {}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let nav;
    	let div2;
    	let t2;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let nav_class_value;
    	let div3_class_value;
    	let mounted;
    	let dispose;
    	let each_value = /*$customFilters*/ ctx[3];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*filterName*/ ctx[59] || {};
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			nav = element("nav");
    			div2 = element("div");
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "prev-custom-filter svelte-12t7idl");
    			add_location(div0, file$5, 390, 4, 13742);
    			attr_dev(div1, "class", "next-custom-filter svelte-12t7idl");
    			add_location(div1, file$5, 397, 4, 13975);
    			attr_dev(div2, "class", "selected-custom-filter-indicator svelte-12t7idl");
    			set_style(div2, "--width", /*selectedElementIndicatorWidth*/ ctx[8] + "px");
    			set_style(div2, "--translateY", /*selectedElementIndicatorOffsetLeft*/ ctx[9] + "px");
    			add_location(div2, file$5, 414, 8, 14508);
    			attr_dev(nav, "id", "custom-filters-nav");

    			attr_dev(nav, "class", nav_class_value = "" + (null_to_empty("nav" + (/*$hasWheel*/ ctx[11] ? " hasWheel" : "") + (/*shouldScrollSnap*/ ctx[14] && /*$android*/ ctx[2]
    			? " android"
    			: "")) + " svelte-12t7idl"));

    			add_location(nav, file$5, 404, 4, 14203);

    			attr_dev(div3, "class", div3_class_value = "" + (null_to_empty("custom-filters-nav" + ((!/*$android*/ ctx[2] || /*isScrolledYMax*/ ctx[0] || /*isFullViewed*/ ctx[1]) && /*$customFilters*/ ctx[3]?.length
    			? " persistent-show"
    			: (/*customFilNavIsAnimating*/ ctx[6] || /*customFiltersNavVisible*/ ctx[5]) && /*$customFilters*/ ctx[3]?.length
    				? ""
    				: " hide")) + " svelte-12t7idl"));

    			set_style(div3, "--opacity", /*$android*/ ctx[2] ? /*customFilOpacity*/ ctx[7] : "");
    			add_location(div3, file$5, 380, 0, 13364);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div3, t1);
    			append_dev(div3, nav);
    			append_dev(nav, div2);
    			append_dev(nav, t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(nav, null);
    				}
    			}

    			/*nav_binding*/ ctx[24](nav);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler*/ ctx[19], false, false, false, false),
    					listen_dev(div0, "keydown", /*keydown_handler*/ ctx[20], false, false, false, false),
    					listen_dev(div1, "click", /*click_handler_1*/ ctx[21], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_1*/ ctx[22], false, false, false, false),
    					listen_dev(nav, "wheel", /*wheel_handler*/ ctx[25], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedElementIndicatorWidth*/ 256) {
    				set_style(div2, "--width", /*selectedElementIndicatorWidth*/ ctx[8] + "px");
    			}

    			if (dirty[0] & /*selectedElementIndicatorOffsetLeft*/ 512) {
    				set_style(div2, "--translateY", /*selectedElementIndicatorOffsetLeft*/ ctx[9] + "px");
    			}

    			if (dirty[0] & /*$customFilters, $selectedCustomFilter, selectCustomFilter*/ 9224) {
    				each_value = /*$customFilters*/ ctx[3];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, nav, destroy_block, create_each_block$1, null, get_each_context$1);
    			}

    			if (dirty[0] & /*$hasWheel, $android*/ 2052 && nav_class_value !== (nav_class_value = "" + (null_to_empty("nav" + (/*$hasWheel*/ ctx[11] ? " hasWheel" : "") + (/*shouldScrollSnap*/ ctx[14] && /*$android*/ ctx[2]
    			? " android"
    			: "")) + " svelte-12t7idl"))) {
    				attr_dev(nav, "class", nav_class_value);
    			}

    			if (dirty[0] & /*$android, isScrolledYMax, isFullViewed, $customFilters, customFilNavIsAnimating, customFiltersNavVisible*/ 111 && div3_class_value !== (div3_class_value = "" + (null_to_empty("custom-filters-nav" + ((!/*$android*/ ctx[2] || /*isScrolledYMax*/ ctx[0] || /*isFullViewed*/ ctx[1]) && /*$customFilters*/ ctx[3]?.length
    			? " persistent-show"
    			: (/*customFilNavIsAnimating*/ ctx[6] || /*customFiltersNavVisible*/ ctx[5]) && /*$customFilters*/ ctx[3]?.length
    				? ""
    				: " hide")) + " svelte-12t7idl"))) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (dirty[0] & /*$android, customFilOpacity*/ 132) {
    				set_style(div3, "--opacity", /*$android*/ ctx[2] ? /*customFilOpacity*/ ctx[7] : "");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			/*nav_binding*/ ctx[24](null);
    			mounted = false;
    			run_all(dispose);
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

    function horizontalWheel$1(event, parentClass) {
    	let element = event.target;
    	let classList = element.classList;

    	if (!classList.contains(parentClass)) {
    		element = element.closest("." + parentClass);
    	}

    	if (element.scrollWidth <= element.clientWidth) return;

    	if (event.deltaY !== 0 && event.deltaX === 0) {
    		event.preventDefault();
    		event.stopPropagation();
    		element.scrollLeft = Math.max(0, element.scrollLeft + event.deltaY);
    	}
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $confirmPromise;
    	let $popupVisible;
    	let $android;
    	let $showFilterOptions;
    	let $dropdownIsVisible;
    	let $selectedCustomFilter;
    	let $listUpdateAvailable;
    	let $customFilters;
    	let $dataStatus;
    	let $hiddenEntries;
    	let $newFinalAnime;
    	let $finalAnimeList;
    	let $animeLoaderWorker;
    	let $listIsUpdating;
    	let $gridFullView;
    	let $shownAllInList;
    	let $hasWheel;
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(40, $confirmPromise = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(41, $popupVisible = $$value));
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(2, $android = $$value));
    	validate_store(showFilterOptions, 'showFilterOptions');
    	component_subscribe($$self, showFilterOptions, $$value => $$invalidate(42, $showFilterOptions = $$value));
    	validate_store(dropdownIsVisible, 'dropdownIsVisible');
    	component_subscribe($$self, dropdownIsVisible, $$value => $$invalidate(43, $dropdownIsVisible = $$value));
    	validate_store(selectedCustomFilter, 'selectedCustomFilter');
    	component_subscribe($$self, selectedCustomFilter, $$value => $$invalidate(10, $selectedCustomFilter = $$value));
    	validate_store(listUpdateAvailable, 'listUpdateAvailable');
    	component_subscribe($$self, listUpdateAvailable, $$value => $$invalidate(44, $listUpdateAvailable = $$value));
    	validate_store(customFilters, 'customFilters');
    	component_subscribe($$self, customFilters, $$value => $$invalidate(3, $customFilters = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(45, $dataStatus = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(46, $hiddenEntries = $$value));
    	validate_store(newFinalAnime, 'newFinalAnime');
    	component_subscribe($$self, newFinalAnime, $$value => $$invalidate(47, $newFinalAnime = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(48, $finalAnimeList = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(49, $animeLoaderWorker = $$value));
    	validate_store(listIsUpdating, 'listIsUpdating');
    	component_subscribe($$self, listIsUpdating, $$value => $$invalidate(50, $listIsUpdating = $$value));
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(17, $gridFullView = $$value));
    	validate_store(shownAllInList, 'shownAllInList');
    	component_subscribe($$self, shownAllInList, $$value => $$invalidate(18, $shownAllInList = $$value));
    	validate_store(hasWheel, 'hasWheel');
    	component_subscribe($$self, hasWheel, $$value => $$invalidate(11, $hasWheel = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CustomFilter', slots, []);
    	let windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth);
    	let customFiltersNav;
    	let customFiltersNavVisible;
    	let animeGridEl;
    	let popupContainer;
    	let showCustomFilter;

    	let lastScrollTop = 0,
    		isScrolledYMax,
    		isFullViewed,
    		customFilNavIsAnimating,
    		customFilOpacity;

    	let showCustomFilterNavTimeout;

    	function customFilterNavVisibility(show) {
    		return new Promise(resolve => {
    				clearTimeout(showCustomFilterNavTimeout);

    				if (show) {
    					$$invalidate(15, showCustomFilter = true);
    					$$invalidate(7, customFilOpacity = 1);
    					resolve();
    				} else {
    					$$invalidate(7, customFilOpacity = 0);

    					showCustomFilterNavTimeout = setTimeout(
    						() => {
    							$$invalidate(15, showCustomFilter = false);
    							resolve();
    						},
    						160
    					);
    				}
    			});
    	}

    	gridFullView.subscribe(() => {
    		setMinHeight();
    	});

    	window.addEventListener("resize", () => {
    		setMinHeight();
    	});

    	function setMinHeight() {
    		if ($gridFullView) {
    			document.documentElement.style.minHeight = "";
    		} else {
    			document.documentElement.style.minHeight = screen.height + 48 + "px";
    		}
    	}

    	async function updateList() {
    		set_store_value(listIsUpdating, $listIsUpdating = true, $listIsUpdating);

    		if ($animeLoaderWorker) {
    			$animeLoaderWorker.terminate();
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    		}

    		animeLoader$1().then(async data => {
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);

    			if (data?.isNew) {
    				if ($finalAnimeList instanceof Array) {
    					set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    				}

    				data?.finalAnimeList?.forEach?.((anime, idx) => {
    					set_store_value(
    						newFinalAnime,
    						$newFinalAnime = {
    							id: anime.id,
    							idx: data.shownAnimeListCount + idx,
    							finalAnimeList: anime
    						},
    						$newFinalAnime
    					);
    				});

    				set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries || $hiddenEntries, $hiddenEntries);
    			}

    			set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    			return;
    		}).catch(error => {
    			console.error(error);
    		});
    	}

    	let unsub = customFilters.subscribe(val => {
    		if (val?.length) unsubCustomFilters();
    		if ($selectedCustomFilter) return;
    		scrollToSelectedCustomFilter();
    	});

    	function unsubCustomFilters() {
    		try {
    			if (unsub) {
    				unsub?.();
    				unsub = null;
    				customFilterNavVisibility(true);
    				unsubCustomFilters = null;
    			}
    		} catch(e) {
    			
    		}
    	}

    	selectedCustomFilter.subscribe(val => {
    		if (typeof val === "string") {
    			scrollToSelectedCustomFilter(val);
    		}
    	});

    	let selectedElementIndicatorWidth, selectedElementIndicatorOffsetLeft;

    	async function scrollToSelectedCustomFilter(val = $selectedCustomFilter) {
    		if (!customFiltersNav) return;
    		await tick();
    		let elementToScroll = Array.from(customFiltersNav?.children || []).find(e => e?.getAttribute?.("custom-filter-name") === val && e?.classList?.contains?.("custom-filter"));

    		if (elementToScroll instanceof Element) {
    			let selectedElementWidth = getElementWidth(elementToScroll) || 26;
    			$$invalidate(8, selectedElementIndicatorWidth = selectedElementWidth * 0.9);
    			$$invalidate(9, selectedElementIndicatorOffsetLeft = elementToScroll?.offsetLeft + parseFloat(window?.getComputedStyle?.(elementToScroll, null)?.paddingLeft) + (selectedElementWidth - selectedElementIndicatorWidth) / 2);
    			let scrollPosition = elementToScroll?.offsetLeft - customFiltersNav?.clientWidth / 2 + elementToScroll?.offsetWidth / 2;
    			customFiltersNav?.scrollTo?.({ left: scrollPosition, behavior: "smooth" });
    		} else {
    			$$invalidate(9, selectedElementIndicatorOffsetLeft = $$invalidate(8, selectedElementIndicatorWidth = -99));
    		}
    	}

    	let goToNextPrevCustomFilterTimeout;

    	function goToNextPrevCustomFilter(event, next = true) {
    		if (event?.target?.classList?.contains("custom-filter")) return;
    		if (!$customFilters?.length) return pleaseWaitAlert();
    		clearTimeout(goToNextPrevCustomFilterTimeout);

    		goToNextPrevCustomFilterTimeout = setTimeout(
    			() => {
    				let selectedCustomFilterIdx = $customFilters.indexOf($selectedCustomFilter);
    				if (selectedCustomFilterIdx < 0) return;
    				let idxToSelect = selectedCustomFilterIdx + (next ? 1 : -1);

    				if (idxToSelect >= 0 && $customFilters?.length > idxToSelect) {
    					let selectingCustomFilterName = $customFilters?.[idxToSelect];
    					if (selectingCustomFilterName) selectCustomFilter(selectingCustomFilterName);
    				}
    			},
    			8
    		);
    	}

    	let scrollFullGridTimeout;

    	async function selectCustomFilter(selectedCustomFilterName) {
    		if (!$customFilters?.length) return pleaseWaitAlert();
    		clearTimeout(scrollFullGridTimeout);
    		customFilterNavVisibility(true);
    		goBackGrid(selectedCustomFilterName);

    		if (selectedCustomFilterName === $selectedCustomFilter) {
    			if ($listUpdateAvailable) {
    				updateList();
    			}

    			return;
    		}

    		set_store_value(selectedCustomFilter, $selectedCustomFilter = selectedCustomFilterName, $selectedCustomFilter);
    		set_store_value(dropdownIsVisible, $dropdownIsVisible = false, $dropdownIsVisible);
    	}

    	let lastClicked, lastClickedTimeout, clickedOnce;

    	async function goBackGrid(selectedCustomFilterName) {
    		let isDoubleClicked;

    		if (lastClicked === selectedCustomFilterName) {
    			lastClicked = selectedCustomFilterName;

    			if (clickedOnce) {
    				isDoubleClicked = true;
    				clickedOnce = false;
    			} else {
    				clickedOnce = true;

    				lastClickedTimeout = setTimeout(
    					() => {
    						clickedOnce = false;
    					},
    					500
    				);
    			}
    		} else {
    			lastClicked = selectedCustomFilterName;
    			clickedOnce = true;
    			clearTimeout(lastClickedTimeout);
    		}

    		let scrollTop;

    		if ($showFilterOptions && isFullViewed) {
    			scrollTop = -9999;
    		} else {
    			if (isFullViewed) {
    				scrollTop = 65;
    			} else {
    				scrollTop = 48;
    			}
    		}

    		if ($android || !matchMedia("(hover:hover)").matches) {
    			document.documentElement.style.overflow = "hidden";
    			document.documentElement.style.overflow = "";
    		}

    		if (isDoubleClicked) {
    			window.scrollY = document.documentElement.scrollTop = scrollTop;
    		} else {
    			window.scrollTo({ top: scrollTop, behavior: "smooth" });
    		}

    		if (isFullViewed) {
    			if (matchMedia("(pointer:fine)").matches) {
    				scrollFullGridTimeout = setTimeout(
    					() => {
    						animeGridEl.style.overflow = "hidden";
    						animeGridEl.style.overflow = "";
    						animeGridEl.scroll({ left: 0, behavior: "smooth" });
    					},
    					100
    				);
    			} else {
    				animeGridEl.style.overflow = "hidden";
    				animeGridEl.style.overflow = "";
    				animeGridEl.scroll({ left: 0, behavior: "smooth" });
    			}
    		}

    		if ($popupVisible) {
    			popupContainer.scrollTop = 0;
    		}
    	}

    	let shouldScrollSnap = getLocalStorage("nonScrollSnapFilters") ?? true;

    	async function pleaseWaitAlert() {
    		return await $confirmPromise({
    			isAlert: true,
    			title: "Initializing resources",
    			text: "Please wait a moment..."
    		});
    	}

    	let touchID, startY, endY, yThreshold = 48;

    	window.addEventListener("touchstart", event => {
    		if (touchID != null || (event?.target?.classList?.contains?.("custom-filter") ?? true)) {
    			return;
    		}

    		startY = event.touches[0].clientY;
    		touchID = event.touches[0].identifier;
    	});

    	window.addEventListener("touchmove", event => {
    		if (touchID == null) return;
    		endY = Array.from(event.changedTouches)?.find(touch => touch.identifier === touchID)?.clientY;

    		if (typeof endY === "number") {
    			let deltaY = endY - startY;
    			let newCustomFilOpacity = Math.min(Math.abs(deltaY / yThreshold), 1);

    			if (!customFiltersNavVisible && deltaY > 0) {
    				$$invalidate(6, customFilNavIsAnimating = true);
    				$$invalidate(7, customFilOpacity = newCustomFilOpacity);
    			} else if (customFiltersNavVisible && deltaY < 0) {
    				$$invalidate(6, customFilNavIsAnimating = true);
    				$$invalidate(7, customFilOpacity = 1 - newCustomFilOpacity);
    			}
    		}
    	});

    	window.showCustomFilter = () => {
    		customFilterNavVisibility(true);
    	};

    	function touchedUp() {
    		touchID = null;

    		customFilterNavVisibility(customFilOpacity > 0.5).then(() => {
    			if (touchID == null) {
    				$$invalidate(6, customFilNavIsAnimating = false);
    			}
    		});
    	}

    	window.addEventListener("touchend", touchedUp);
    	window.addEventListener("touchcancel", touchedUp);

    	window.addEventListener("resize", () => {
    		windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth);
    		scrollToSelectedCustomFilter();
    	});

    	window.addEventListener("scroll", () => {
    		$$invalidate(16, lastScrollTop = document.documentElement.scrollTop);
    	});

    	onMount(() => {
    		windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth);
    		$$invalidate(4, customFiltersNav = customFiltersNav || document.getElementById("custom-filters-nav"));
    		animeGridEl = document.getElementById("anime-grid");
    		$$invalidate(16, lastScrollTop = document.documentElement.scrollTop);
    		popupContainer = document?.getElementById("popup-container");
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$4.warn(`<CustomFilter> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => goToNextPrevCustomFilter(e, false);

    	const keydown_handler = e => {
    		e.key === "Enter" && goToNextPrevCustomFilter(e, false);
    	};

    	const click_handler_1 = e => goToNextPrevCustomFilter(e, true);

    	const keydown_handler_1 = e => {
    		e.key === "Enter" && goToNextPrevCustomFilter(true);
    	};

    	const keydown_handler_2 = (filterName, e) => {
    		e.key === "Enter" && selectCustomFilter(filterName);
    	};

    	function nav_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			customFiltersNav = $$value;
    			$$invalidate(4, customFiltersNav);
    		});
    	}

    	const wheel_handler = e => {
    		horizontalWheel$1(e, "nav");
    	};

    	$$self.$capture_state = () => ({
    		confirmPromise,
    		customFilters,
    		selectedCustomFilter,
    		gridFullView,
    		android: android$1,
    		hasWheel,
    		showFilterOptions,
    		dropdownIsVisible,
    		popupVisible,
    		listIsUpdating,
    		animeLoaderWorker: animeLoaderWorker$1,
    		finalAnimeList,
    		hiddenEntries,
    		dataStatus,
    		listUpdateAvailable,
    		shownAllInList,
    		newFinalAnime,
    		onMount,
    		tick,
    		getElementWidth,
    		getLocalStorage,
    		trimAllEmptyChar,
    		animeLoader: animeLoader$1,
    		windowWidth,
    		customFiltersNav,
    		customFiltersNavVisible,
    		animeGridEl,
    		popupContainer,
    		showCustomFilter,
    		lastScrollTop,
    		isScrolledYMax,
    		isFullViewed,
    		customFilNavIsAnimating,
    		customFilOpacity,
    		showCustomFilterNavTimeout,
    		customFilterNavVisibility,
    		setMinHeight,
    		updateList,
    		unsub,
    		unsubCustomFilters,
    		selectedElementIndicatorWidth,
    		selectedElementIndicatorOffsetLeft,
    		scrollToSelectedCustomFilter,
    		goToNextPrevCustomFilterTimeout,
    		goToNextPrevCustomFilter,
    		scrollFullGridTimeout,
    		selectCustomFilter,
    		lastClicked,
    		lastClickedTimeout,
    		clickedOnce,
    		goBackGrid,
    		shouldScrollSnap,
    		horizontalWheel: horizontalWheel$1,
    		pleaseWaitAlert,
    		touchID,
    		startY,
    		endY,
    		yThreshold,
    		touchedUp,
    		$confirmPromise,
    		$popupVisible,
    		$android,
    		$showFilterOptions,
    		$dropdownIsVisible,
    		$selectedCustomFilter,
    		$listUpdateAvailable,
    		$customFilters,
    		$dataStatus,
    		$hiddenEntries,
    		$newFinalAnime,
    		$finalAnimeList,
    		$animeLoaderWorker,
    		$listIsUpdating,
    		$gridFullView,
    		$shownAllInList,
    		$hasWheel
    	});

    	$$self.$inject_state = $$props => {
    		if ('windowWidth' in $$props) windowWidth = $$props.windowWidth;
    		if ('customFiltersNav' in $$props) $$invalidate(4, customFiltersNav = $$props.customFiltersNav);
    		if ('customFiltersNavVisible' in $$props) $$invalidate(5, customFiltersNavVisible = $$props.customFiltersNavVisible);
    		if ('animeGridEl' in $$props) animeGridEl = $$props.animeGridEl;
    		if ('popupContainer' in $$props) popupContainer = $$props.popupContainer;
    		if ('showCustomFilter' in $$props) $$invalidate(15, showCustomFilter = $$props.showCustomFilter);
    		if ('lastScrollTop' in $$props) $$invalidate(16, lastScrollTop = $$props.lastScrollTop);
    		if ('isScrolledYMax' in $$props) $$invalidate(0, isScrolledYMax = $$props.isScrolledYMax);
    		if ('isFullViewed' in $$props) $$invalidate(1, isFullViewed = $$props.isFullViewed);
    		if ('customFilNavIsAnimating' in $$props) $$invalidate(6, customFilNavIsAnimating = $$props.customFilNavIsAnimating);
    		if ('customFilOpacity' in $$props) $$invalidate(7, customFilOpacity = $$props.customFilOpacity);
    		if ('showCustomFilterNavTimeout' in $$props) showCustomFilterNavTimeout = $$props.showCustomFilterNavTimeout;
    		if ('unsub' in $$props) unsub = $$props.unsub;
    		if ('selectedElementIndicatorWidth' in $$props) $$invalidate(8, selectedElementIndicatorWidth = $$props.selectedElementIndicatorWidth);
    		if ('selectedElementIndicatorOffsetLeft' in $$props) $$invalidate(9, selectedElementIndicatorOffsetLeft = $$props.selectedElementIndicatorOffsetLeft);
    		if ('goToNextPrevCustomFilterTimeout' in $$props) goToNextPrevCustomFilterTimeout = $$props.goToNextPrevCustomFilterTimeout;
    		if ('scrollFullGridTimeout' in $$props) scrollFullGridTimeout = $$props.scrollFullGridTimeout;
    		if ('lastClicked' in $$props) lastClicked = $$props.lastClicked;
    		if ('lastClickedTimeout' in $$props) lastClickedTimeout = $$props.lastClickedTimeout;
    		if ('clickedOnce' in $$props) clickedOnce = $$props.clickedOnce;
    		if ('shouldScrollSnap' in $$props) $$invalidate(14, shouldScrollSnap = $$props.shouldScrollSnap);
    		if ('touchID' in $$props) touchID = $$props.touchID;
    		if ('startY' in $$props) startY = $$props.startY;
    		if ('endY' in $$props) endY = $$props.endY;
    		if ('yThreshold' in $$props) yThreshold = $$props.yThreshold;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*lastScrollTop, $shownAllInList, isScrolledYMax*/ 327681) {
    			{
    				$$invalidate(0, isScrolledYMax = lastScrollTop >= document?.documentElement?.scrollHeight - window?.innerHeight - 1 && $shownAllInList);

    				if (isScrolledYMax) {
    					$$invalidate(7, customFilOpacity = 1);
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*$gridFullView, isFullViewed*/ 131074) {
    			{
    				$$invalidate(1, isFullViewed = $gridFullView ?? getLocalStorage("gridFullView") ?? false);

    				if (isFullViewed) {
    					$$invalidate(7, customFilOpacity = 1);
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*$customFilters, $android, showCustomFilter*/ 32780) {
    			{
    				$$invalidate(5, customFiltersNavVisible = $customFilters?.length && (!$android || showCustomFilter));
    			}
    		}
    	};

    	return [
    		isScrolledYMax,
    		isFullViewed,
    		$android,
    		$customFilters,
    		customFiltersNav,
    		customFiltersNavVisible,
    		customFilNavIsAnimating,
    		customFilOpacity,
    		selectedElementIndicatorWidth,
    		selectedElementIndicatorOffsetLeft,
    		$selectedCustomFilter,
    		$hasWheel,
    		goToNextPrevCustomFilter,
    		selectCustomFilter,
    		shouldScrollSnap,
    		showCustomFilter,
    		lastScrollTop,
    		$gridFullView,
    		$shownAllInList,
    		click_handler,
    		keydown_handler,
    		click_handler_1,
    		keydown_handler_1,
    		keydown_handler_2,
    		nav_binding,
    		wheel_handler
    	];
    }

    class CustomFilter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CustomFilter",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\components\Fixed\Navigator.svelte generated by Svelte v3.59.1 */

    const { console: console_1$3 } = globals;
    const file$4 = "src\\components\\Fixed\\Navigator.svelte";

    function create_fragment$4(ctx) {
    	let div4;
    	let nav;
    	let div0;
    	let svg0;
    	let path0;
    	let t0;
    	let div2;
    	let label;
    	let t2;
    	let input;
    	let t3;
    	let div1;
    	let t4_value = (/*typedUsername*/ ctx[0] || "Your Anilist Username") + "";
    	let t4;
    	let t5;
    	let div3;
    	let svg1;
    	let path1;
    	let nav_class_value;
    	let div4_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			nav = element("nav");
    			div0 = element("div");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t0 = space();
    			div2 = element("div");
    			label = element("label");
    			label.textContent = "Anilist Username";
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			div1 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			div3 = element("div");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M9 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 288h307a32 32 0 1 0 0-64H109l106-105a32 32 0 0 0-46-46L9 233z");
    			attr_dev(path0, "class", "svelte-12amu4x");
    			add_location(path0, file$4, 345, 17, 13533);
    			attr_dev(svg0, "class", "goback svelte-12amu4x");
    			attr_dev(svg0, "tabindex", "0");
    			attr_dev(svg0, "viewBox", "0 0 448 512");
    			add_location(svg0, file$4, 340, 12, 13335);
    			attr_dev(div0, "class", "go-back-container svelte-12amu4x");
    			add_location(div0, file$4, 338, 8, 13233);
    			attr_dev(label, "class", "disable-interaction svelte-12amu4x");
    			attr_dev(label, "for", "usernameInput");
    			add_location(label, file$4, 351, 12, 13785);
    			attr_dev(input, "id", "usernameInput");
    			attr_dev(input, "type", "search");
    			attr_dev(input, "enterkeyhint", "search");
    			attr_dev(input, "autocomplete", "off");
    			attr_dev(input, "placeholder", "Your Anilist Username");
    			attr_dev(input, "class", "svelte-12amu4x");
    			add_location(input, file$4, 354, 12, 13910);
    			attr_dev(div1, "class", "" + (null_to_empty("usernameText") + " svelte-12amu4x"));
    			add_location(div1, file$4, 366, 12, 14409);
    			attr_dev(div2, "class", "input-search svelte-12amu4x");
    			add_location(div2, file$4, 350, 8, 13745);
    			attr_dev(path1, "d", "m144 7-2 2-1 1c-2 0-9 7-9 9l-2 2-1 1-1 2-3 5c-1 3-3 4-4 5l-1 3-1 1v1l-1 1-15 1-12 1c-11 1-12 1-18-4l-7-6-6-6-4-2s-2-1-2-3-3-2-3-2l-2-2-2-1-1-1-2-1-2-1-8-4c-3 0-7 5-6 6l-1 1v24a350 350 0 0 0 7 36c0 2-1 3-2 3v2l-1 1-3 7-1 2-3 9a61 61 0 0 0 4 30v2l2 3 3 7 1 1v1l1 2 1 1 1 1c0 1 0 2 2 3l2 4 2 2 2 2 6 7 5 7 1 1 1 1v3l4 10 1 14a75 75 0 0 0 2 19l1 4v2l2 3v2a205 205 0 0 0 15 29l1 1v1a128 128 0 0 1 11 22v1l1 1 1 1v3l1 2 2 5a480 480 0 0 1-2 93c0 1-4 6-6 6l-11 11-1 4c-2 3 0 7 8 14 1 1 2 2 1 3l1 3v1l1 2 1 2 3 3h3l1 1 4 1 2 1c0 1 16 2 19 1l2-1h2l7-5 1-1c2 0 11-10 12-13l1-2 1-1c-1-3 0-3 8-2l5 1 2 1-1 3-1 9 2 3 1 2 1 2 3 3 2 1 2 1 4 2 14 1a232 232 0 0 0 56-9l4-1 4-1h8l3 2h1l2 1a93 93 0 0 0 30-1l6-3 4-1 1-1 1-1h2l1-1 1-1 3-1 4-2h3l1-1h2l1-1h2l2-1h2l2-1h2l2-1 3-1h6c12-2 16-2 30-2a174 174 0 0 1 45 5l2 1h3l5 3 5 2 1 1 3 3 3 3 1 1 1 4c0 3-1 4-4 7l-4 3-1 1-8 4-5 2-8 2-5 2h-1l-2 1h-2l-3 1-1 1h-2l-3 1h-4l-10 2c-2 1-11 9-11 11-1 5 0 8 2 10l4 3 2 1 16 1 18-1 5-1 2-1h2l2-1h2l2-1h2l1-1h2l1-1 2-1h2l3-1 3-2h2l1-1 1-1c1 1 13-5 13-6h1l1-1 2-1 1-1h1l2-1 2-2 2-1 1-2c2 0 9-7 9-9l2-1 1-2v-1l1-1v-1l1-1v-1l1-2v-2c1-2 1-8-1-12v-1l-1-1-1-1c0-2-11-14-13-14l-2-2-2-2-2-1-5-3c-3-1-4-3-5-4l-3-1-1-1h-1l-1-1c0-1-4-3-5-2l-1-1h-1l-1-1-1-1-4-1-3-1-1-1h-1l-1-1h-2c-1 1-1 0-1-1h-2l-1-1-1-1h-2l-2-1h-2l-4-1-6-2-6-1-4-1-3-1-12-1a252 252 0 0 0-76 1v-2l1-3 1-5 1-2v-1l1-3 1-4 2-11 1-6c4-24 4-56 1-78l-1-5-1-3-1-7-1-2-1-3-1-5v-1l-1-1v-2l-1-1v-2l-1-2-1-3-1-2-1-3-1-1v-1l-1-1v-1l-1-1-2-4-3-5-1-1-1-2-1-1-1-2-1-1-1-3-2-1-9-11a68 68 0 0 0-15-12l-4-3-1-1-1-1-2-1-2-2-3-1-5-2-1-1h-1l-1-1-1-1-4-1-3-1-2-2h-3l-1-1h-2l-1-1h-2l-1-1h-2l-1-1-3-1h-3l-1-2-2-1-1-1-2-1h-1l-2-2-2-1-2-2c-1 0-10-9-10-11l-2-2-1-1-1-3a66 66 0 0 0-16-15l-1-1-2-1-1-1-3-1v-2l-1-1v-2l-1-1-1-2v-2l-2-3v-3l-1-1-1-1-4-9-2-2c-1-2-1-4 1-12a233 233 0 0 0 1-52v-2l-2-5c-2-3-3-3-6-3h-7z");
    			attr_dev(path1, "class", "svelte-12amu4x");
    			add_location(path1, file$4, 396, 16, 15507);
    			attr_dev(svg1, "viewBox", "0 0 500 500");
    			attr_dev(svg1, "class", "logo-icon svelte-12amu4x");
    			attr_dev(svg1, "aria-label", "Kanshi Logo");
    			attr_dev(svg1, "tabindex", "0");
    			add_location(svg1, file$4, 382, 12, 14996);
    			attr_dev(div3, "class", "logo-icon-container svelte-12amu4x");
    			add_location(div3, file$4, 375, 8, 14769);
    			attr_dev(nav, "id", "nav");

    			attr_dev(nav, "class", nav_class_value = "" + (null_to_empty("nav " + (/*$popupVisible*/ ctx[3] || /*$menuVisible*/ ctx[4]
    			? "popupvisible"
    			: /*inputUsernameEl*/ ctx[1] === document?.activeElement
    				? "inputfocused"
    				: "")) + " svelte-12amu4x"));

    			add_location(nav, file$4, 326, 4, 12809);
    			attr_dev(div4, "class", div4_class_value = "" + (null_to_empty("nav-container" + (/*$menuVisible*/ ctx[4] ? " menu-visible" : "")) + " svelte-12amu4x"));
    			add_location(div4, file$4, 321, 0, 12620);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, nav);
    			append_dev(nav, div0);
    			append_dev(div0, svg0);
    			append_dev(svg0, path0);
    			append_dev(nav, t0);
    			append_dev(nav, div2);
    			append_dev(div2, label);
    			append_dev(div2, t2);
    			append_dev(div2, input);
    			set_input_value(input, /*typedUsername*/ ctx[0]);
    			/*input_binding*/ ctx[15](input);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, t4);
    			append_dev(nav, t5);
    			append_dev(nav, div3);
    			append_dev(div3, svg1);
    			append_dev(svg1, path1);
    			/*nav_binding*/ ctx[18](nav);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg0, "keydown", /*keydown_handler*/ ctx[12], false, false, false, false),
    					listen_dev(div0, "click", /*handleGoBack*/ ctx[8], false, false, false, false),
    					listen_dev(input, "keydown", /*keydown_handler_1*/ ctx[13], false, false, false, false),
    					listen_dev(input, "focusin", /*onfocusUsernameInput*/ ctx[11], false, false, false, false),
    					listen_dev(input, "focusout", /*onfocusUsernameInput*/ ctx[11], false, false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[14]),
    					listen_dev(div1, "click", /*focusInputUsernameEl*/ ctx[7], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_2*/ ctx[16], false, false, false, false),
    					listen_dev(svg1, "keydown", /*keydown_handler_3*/ ctx[17], false, false, false, false),
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

    			if (dirty[0] & /*typedUsername*/ 1 && t4_value !== (t4_value = (/*typedUsername*/ ctx[0] || "Your Anilist Username") + "")) set_data_dev(t4, t4_value);

    			if (dirty[0] & /*$popupVisible, $menuVisible, inputUsernameEl*/ 26 && nav_class_value !== (nav_class_value = "" + (null_to_empty("nav " + (/*$popupVisible*/ ctx[3] || /*$menuVisible*/ ctx[4]
    			? "popupvisible"
    			: /*inputUsernameEl*/ ctx[1] === document?.activeElement
    				? "inputfocused"
    				: "")) + " svelte-12amu4x"))) {
    				attr_dev(nav, "class", nav_class_value);
    			}

    			if (dirty[0] & /*$menuVisible*/ 16 && div4_class_value !== (div4_class_value = "" + (null_to_empty("nav-container" + (/*$menuVisible*/ ctx[4] ? " menu-visible" : "")) + " svelte-12amu4x"))) {
    				attr_dev(div4, "class", div4_class_value);
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
    	let $username;
    	let $dataStatus;
    	let $userRequestIsRunning;
    	let $finalAnimeList;
    	let $initData;
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(26, $confirmPromise = $$value));
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(27, $gridFullView = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(3, $popupVisible = $$value));
    	validate_store(menuVisible, 'menuVisible');
    	component_subscribe($$self, menuVisible, $$value => $$invalidate(4, $menuVisible = $$value));
    	validate_store(username, 'username');
    	component_subscribe($$self, username, $$value => $$invalidate(28, $username = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(29, $dataStatus = $$value));
    	validate_store(userRequestIsRunning, 'userRequestIsRunning');
    	component_subscribe($$self, userRequestIsRunning, $$value => $$invalidate(30, $userRequestIsRunning = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(31, $finalAnimeList = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(32, $initData = $$value));
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

    	let awaitForInit;

    	initData.subscribe(val => {
    		if (val === false) {
    			awaitForInit?.resolve?.();
    		}
    	});

    	async function updateUsername(event, isReconfirm = false) {
    		if ($initData) {
    			pleaseWaitAlert();

    			new Promise(resolve => {
    					awaitForInit = { resolve };
    				}).then(() => {
    				updateUsername(event, true);
    			});

    			return;
    		}

    		let element = event.target;
    		let classList = element.classList;

    		if (event.key === "Enter" || event.type === "click" && (classList.contains("searchBtn") || element?.closest?.(".searchBtn"))) {
    			if (!typedUsername) return;

    			if (typedUsername !== $username) {
    				if (!navigator.onLine) {
    					$$invalidate(0, typedUsername = $username || "");

    					return $confirmPromise({
    						isAlert: true,
    						title: "Currently Offline",
    						text: "It seems that you're currently offline and unable to update."
    					});
    				}

    				(async () => {
    					let usernameToShow = `<span style="color:#00cbf9;">${typedUsername}</span>`;

    					if ($username) {
    						if (await $confirmPromise(`Do you${isReconfirm ? " still" : ""} want to connect to ${usernameToShow}?`)) {
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
    									setLocalStorage("username", newusername).catch(() => {
    										removeLocalStorage("username");
    									});

    									$$invalidate(0, typedUsername = set_store_value(username, $username = newusername || "", $username));
    									importantUpdate.update(e => !e);
    								} else {
    									$$invalidate(0, typedUsername = $username || "");
    								}
    							}).catch(error => {
    								$$invalidate(0, typedUsername = $username || "");
    								set_store_value(dataStatus, $dataStatus = "Something went wrong", $dataStatus);
    								console.error(error);
    							});
    						} else {
    							$$invalidate(0, typedUsername = $username || "");
    							focusInputUsernameEl();
    						}
    					} else {
    						if (await $confirmPromise(`Do you${isReconfirm ? " still" : ""} want to connect to ${usernameToShow}?`)) {
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
    									setLocalStorage("username", newusername).catch(() => {
    										removeLocalStorage("username");
    									});

    									$$invalidate(0, typedUsername = set_store_value(username, $username = newusername || "", $username));
    								} else {
    									$$invalidate(0, typedUsername = $username || "");
    								}

    								importantUpdate.update(e => !e);
    							}).catch(error => {
    								$$invalidate(0, typedUsername = $username || "");
    								set_store_value(dataStatus, $dataStatus = "Something went wrong", $dataStatus);
    								console.error(error);
    							});
    						} else {
    							$$invalidate(0, typedUsername = $username || "");
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
    		if (!(classList.contains("nav") || classList.contains("nav-container")) && !(classList.contains("logo-icon") || element.closest(".logo-icon"))) return;

    		if (inputUsernameElFocused && !(classList.contains("logo-icon") || element.closest(".logo-icon"))) {
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
    					popupContainer.scroll({ top: 0, behavior: "smooth" });
    				} else {
    					if ($gridFullView) {
    						animeGridEl.style.overflow = "hidden";
    						animeGridEl.style.overflow = "";
    						animeGridEl.scroll({ left: 0, behavior: "smooth" });
    					} else {
    						window.showCustomFilter?.();
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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<Navigator> was created with unknown prop '${key}'`);
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

    	const keydown_handler_3 = e => {
    		if (e.key === "Enter") {
    			e.stopPropagation();
    			set_store_value(menuVisible, $menuVisible = !$menuVisible, $menuVisible);
    		} else if (e.key !== "Escape") {
    			e.stopPropagation();
    		}
    	};

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
    		removeLocalStorage,
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
    		awaitForInit,
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
    		$username,
    		$dataStatus,
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
    		if ('awaitForInit' in $$props) awaitForInit = $$props.awaitForInit;
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

    const { console: console_1$2 } = globals;

    const file$3 = "src\\components\\Fixed\\Menu.svelte";

    // (311:0) {#if $menuVisible}
    function create_if_block$3(ctx) {
    	let div1;
    	let div0;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let button3;
    	let t7;
    	let t8;
    	let button4;
    	let t9;
    	let button4_class_value;
    	let t10;
    	let button5;
    	let t11;
    	let button5_class_value;
    	let t12;
    	let t13;
    	let t14;
    	let button6;
    	let t16;
    	let button7;
    	let div1_outro;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$android*/ ctx[1] && create_if_block_3$1(ctx);
    	let if_block1 = /*$android*/ ctx[1] && create_if_block_2$1(ctx);
    	let if_block2 = /*$android*/ ctx[1] && create_if_block_1$2(ctx);

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
    			t9 = text("Show Status");
    			t10 = space();
    			button5 = element("button");
    			t11 = text("Auto Update");
    			t12 = space();
    			if (if_block1) if_block1.c();
    			t13 = space();
    			if (if_block2) if_block2.c();
    			t14 = space();
    			button6 = element("button");
    			button6.textContent = "Reload";
    			t16 = space();
    			button7 = element("button");
    			button7.textContent = "Create an Anilist Account";
    			attr_dev(button0, "class", "button svelte-nfpz7z");
    			add_location(button0, file$3, 323, 12, 10541);
    			attr_dev(button1, "class", "button svelte-nfpz7z");
    			add_location(button1, file$3, 329, 12, 10758);
    			attr_dev(button2, "class", "button svelte-nfpz7z");
    			add_location(button2, file$3, 335, 12, 11007);
    			attr_dev(button3, "class", "button svelte-nfpz7z");
    			add_location(button3, file$3, 341, 12, 11224);
    			attr_dev(button4, "class", button4_class_value = "" + (null_to_empty("button " + (/*$showStatus*/ ctx[2] ? "selected" : "")) + " svelte-nfpz7z"));
    			add_location(button4, file$3, 358, 12, 11866);
    			attr_dev(button5, "class", button5_class_value = "" + (null_to_empty("button " + (/*$autoUpdate*/ ctx[6] ? "selected" : "")) + " svelte-nfpz7z"));
    			add_location(button5, file$3, 364, 12, 12128);
    			attr_dev(button6, "class", "button svelte-nfpz7z");
    			add_location(button6, file$3, 403, 12, 13770);
    			attr_dev(button7, "class", "button svelte-nfpz7z");
    			add_location(button7, file$3, 408, 12, 13956);
    			attr_dev(div0, "class", "menu svelte-nfpz7z");
    			add_location(div0, file$3, 322, 8, 10509);
    			attr_dev(div1, "class", "menu-container svelte-nfpz7z");
    			add_location(div1, file$3, 311, 4, 10149);
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
    			append_dev(div0, button5);
    			append_dev(button5, t11);
    			append_dev(div0, t12);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div0, t13);
    			if (if_block2) if_block2.m(div0, null);
    			append_dev(div0, t14);
    			append_dev(div0, button6);
    			append_dev(div0, t16);
    			append_dev(div0, button7);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*updateList*/ ctx[10], false, false, false, false),
    					listen_dev(button0, "keydown", /*keydown_handler*/ ctx[23], false, false, false, false),
    					listen_dev(button1, "click", /*showAllHiddenEntries*/ ctx[14], false, false, false, false),
    					listen_dev(button1, "keydown", /*keydown_handler_1*/ ctx[24], false, false, false, false),
    					listen_dev(button2, "click", /*importData*/ ctx[7], false, false, false, false),
    					listen_dev(button2, "keydown", /*keydown_handler_2*/ ctx[25], false, false, false, false),
    					listen_dev(button3, "click", /*exportData*/ ctx[9], false, false, false, false),
    					listen_dev(button3, "keydown", /*keydown_handler_3*/ ctx[26], false, false, false, false),
    					listen_dev(button4, "click", /*showDataStatus*/ ctx[15], false, false, false, false),
    					listen_dev(button4, "keydown", /*keydown_handler_5*/ ctx[28], false, false, false, false),
    					listen_dev(button5, "click", /*handleUpdateEveryHour*/ ctx[11], false, false, false, false),
    					listen_dev(button5, "keydown", /*keydown_handler_6*/ ctx[29], false, false, false, false),
    					listen_dev(button6, "keydown", /*keydown_handler_12*/ ctx[35], false, false, false, false),
    					listen_dev(button6, "click", /*reload*/ ctx[19], false, false, false, false),
    					listen_dev(button7, "click", /*anilistSignup*/ ctx[16], false, false, false, false),
    					listen_dev(button7, "keydown", /*keydown_handler_13*/ ctx[36], false, false, false, false),
    					listen_dev(div1, "click", /*click_handler*/ ctx[37], false, false, false, false),
    					listen_dev(div1, "touchend", /*handleMenuVisibility*/ ctx[13], { passive: true }, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_14*/ ctx[38], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*$android*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3$1(ctx);
    					if_block0.c();
    					if_block0.m(div0, t8);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!current || dirty[0] & /*$showStatus*/ 4 && button4_class_value !== (button4_class_value = "" + (null_to_empty("button " + (/*$showStatus*/ ctx[2] ? "selected" : "")) + " svelte-nfpz7z"))) {
    				attr_dev(button4, "class", button4_class_value);
    			}

    			if (!current || dirty[0] & /*$autoUpdate*/ 64 && button5_class_value !== (button5_class_value = "" + (null_to_empty("button " + (/*$autoUpdate*/ ctx[6] ? "selected" : "")) + " svelte-nfpz7z"))) {
    				attr_dev(button5, "class", button5_class_value);
    			}

    			if (/*$android*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					if_block1.m(div0, t13);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*$android*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$2(ctx);
    					if_block2.c();
    					if_block2.m(div0, t14);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (div1_outro) div1_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			div1_outro = create_out_transition(div1, fade, { duration: 200 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (detaching && div1_outro) div1_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(311:0) {#if $menuVisible}",
    		ctx
    	});

    	return block;
    }

    // (348:12) {#if $android}
    function create_if_block_3$1(ctx) {
    	let button;
    	let t_value = (/*$exportPathIsAvailable*/ ctx[5] ? "Change" : "Set") + " Export Folder" + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "button svelte-nfpz7z");
    			add_location(button, file$3, 348, 16, 11473);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", handleExportFolder, false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler_4*/ ctx[27], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$exportPathIsAvailable*/ 32 && t_value !== (t_value = (/*$exportPathIsAvailable*/ ctx[5] ? "Change" : "Set") + " Export Folder" + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(348:12) {#if $android}",
    		ctx
    	});

    	return block;
    }

    // (372:12) {#if $android}
    function create_if_block_2$1(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Auto Export");
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty("button " + (/*$autoExport*/ ctx[4] ? "selected" : "")) + " svelte-nfpz7z"));
    			add_location(button, file$3, 372, 16, 12457);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*handleExportEveryHour*/ ctx[12], false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler_7*/ ctx[30], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$autoExport*/ 16 && button_class_value !== (button_class_value = "" + (null_to_empty("button " + (/*$autoExport*/ ctx[4] ? "selected" : "")) + " svelte-nfpz7z"))) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(372:12) {#if $android}",
    		ctx
    	});

    	return block;
    }

    // (381:12) {#if $android}
    function create_if_block_1$2(ctx) {
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let button3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Show Recent Releases";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Switch App Mode";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "Clear Cache";
    			t5 = space();
    			button3 = element("button");
    			button3.textContent = "Refresh";
    			attr_dev(button0, "class", "button svelte-nfpz7z");
    			add_location(button0, file$3, 381, 16, 12829);
    			attr_dev(button1, "class", "button svelte-nfpz7z");
    			add_location(button1, file$3, 387, 16, 13098);
    			attr_dev(button2, "class", "button svelte-nfpz7z");
    			add_location(button2, file$3, 392, 16, 13327);
    			attr_dev(button3, "class", "button svelte-nfpz7z");
    			add_location(button3, file$3, 397, 16, 13546);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button2, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, button3, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "keydown", /*keydown_handler_8*/ ctx[31], false, false, false, false),
    					listen_dev(button0, "click", /*showRecentReleases*/ ctx[17], false, false, false, false),
    					listen_dev(button1, "keydown", /*keydown_handler_9*/ ctx[32], false, false, false, false),
    					listen_dev(button1, "click", /*switchAppMode*/ ctx[18], false, false, false, false),
    					listen_dev(button2, "keydown", /*keydown_handler_10*/ ctx[33], false, false, false, false),
    					listen_dev(button2, "click", /*clearCache*/ ctx[21], false, false, false, false),
    					listen_dev(button3, "keydown", /*keydown_handler_11*/ ctx[34], false, false, false, false),
    					listen_dev(button3, "click", /*refresh*/ ctx[20], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(button3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(381:12) {#if $android}",
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
    	let if_block = /*$menuVisible*/ ctx[3] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			input = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(input, "id", "import-file");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".json");
    			set_style(input, "display", `none`);
    			add_location(input, file$3, 302, 0, 9963);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[22](input);
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*importJSONFile*/ ctx[8], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*$menuVisible*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*$menuVisible*/ 8) {
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
    			/*input_binding*/ ctx[22](null);
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
    	let $showStatus;
    	let $dataStatus;
    	let $hiddenEntries;
    	let $newFinalAnime;
    	let $finalAnimeList;
    	let $animeLoaderWorker;
    	let $listUpdateAvailable;
    	let $menuVisible;
    	let $popupVisible;
    	let $autoExport;
    	let $exportPathIsAvailable;
    	let $autoUpdate;
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(39, $confirmPromise = $$value));
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(1, $android = $$value));
    	validate_store(showStatus, 'showStatus');
    	component_subscribe($$self, showStatus, $$value => $$invalidate(2, $showStatus = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(40, $dataStatus = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(41, $hiddenEntries = $$value));
    	validate_store(newFinalAnime, 'newFinalAnime');
    	component_subscribe($$self, newFinalAnime, $$value => $$invalidate(42, $newFinalAnime = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(43, $finalAnimeList = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(44, $animeLoaderWorker = $$value));
    	validate_store(listUpdateAvailable, 'listUpdateAvailable');
    	component_subscribe($$self, listUpdateAvailable, $$value => $$invalidate(45, $listUpdateAvailable = $$value));
    	validate_store(menuVisible, 'menuVisible');
    	component_subscribe($$self, menuVisible, $$value => $$invalidate(3, $menuVisible = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(46, $popupVisible = $$value));
    	validate_store(autoExport, 'autoExport');
    	component_subscribe($$self, autoExport, $$value => $$invalidate(4, $autoExport = $$value));
    	validate_store(exportPathIsAvailable, 'exportPathIsAvailable');
    	component_subscribe($$self, exportPathIsAvailable, $$value => $$invalidate(5, $exportPathIsAvailable = $$value));
    	validate_store(autoUpdate, 'autoUpdate');
    	component_subscribe($$self, autoUpdate, $$value => $$invalidate(6, $autoUpdate = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Menu', slots, []);
    	let importFileInput;

    	async function importData() {
    		if (!(importFileInput instanceof Element)) return set_store_value(dataStatus, $dataStatus = "Something went wrong", $dataStatus);

    		if (await $confirmPromise("Do you want to import your data?")) {
    			importFileInput.click();
    		}
    	}

    	async function importJSONFile() {
    		if (!(importFileInput instanceof Element)) return set_store_value(dataStatus, $dataStatus = "Something went wrong", $dataStatus);
    		let importedFile = importFileInput.files?.[0];

    		if (importedFile) {
    			let filename = importedFile.name;

    			let filenameToShow = filename
    			? `named <span style="color:#00cbf9;">${filename}</span> `
    			: "";

    			if (await $confirmPromise(`File ${filenameToShow}has been detected, do you want to import the file?`)) {
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
    					set_store_value(dataStatus, $dataStatus = error || "Something went wrong", $dataStatus);
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

    		setLocalStorage("exportPathIsAvailable", $exportPathIsAvailable).catch(() => {
    			saveJSON($exportPathIsAvailable, "exportPathIsAvailable");
    			removeLocalStorage("exportPathIsAvailable");
    		});
    	};

    	async function exportData() {
    		if (!$exportPathIsAvailable && $android) return handleExportFolder();

    		if (await $confirmPromise("Do you want to export your data?")) {
    			set_store_value(menuVisible, $menuVisible = false, $menuVisible);
    			runExport.update(e => !e);
    		}
    	}

    	async function updateList() {
    		if (!navigator.onLine) {
    			return $confirmPromise({
    				isAlert: true,
    				title: "Currently offline",
    				text: "It seems that you're currently offline and unable to update."
    			});
    		}

    		if (await $confirmPromise("Do you want to update your list?")) {
    			set_store_value(menuVisible, $menuVisible = false, $menuVisible);
    			runUpdate.update(e => !e);
    		}
    	}

    	async function handleUpdateEveryHour() {
    		if (await $confirmPromise(`Do you want to ${$autoUpdate ? "disable" : "enable"} auto-update?`)) {
    			set_store_value(autoUpdate, $autoUpdate = !$autoUpdate, $autoUpdate);
    		}
    	}

    	async function handleExportEveryHour() {
    		if (!$exportPathIsAvailable && $android) return handleExportFolder();

    		if (await $confirmPromise(`Do you want to ${$autoExport ? "disable" : "enable"} auto-export?`)) {
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
    		if (jsonIsEmpty($hiddenEntries)) {
    			// Alert No Hidden Entries
    			$confirmPromise({
    				isAlert: true,
    				text: "There are currently no hidden entries."
    			});

    			return;
    		} else if (await $confirmPromise("Do you want to show all your hidden anime entries?")) {
    			if ($animeLoaderWorker) {
    				$animeLoaderWorker.terminate();
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    			}

    			if (!$popupVisible) {
    				set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);
    			}

    			set_store_value(dataStatus, $dataStatus = "Updating List", $dataStatus);
    			set_store_value(menuVisible, $menuVisible = false, $menuVisible);
    			set_store_value(listUpdateAvailable, $listUpdateAvailable = false, $listUpdateAvailable);
    			await saveJSON(true, "shouldLoadNewAnime");

    			animeLoader({ hiddenEntries: $hiddenEntries }).then(async data => {
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);

    				if (data?.isNew) {
    					if ($finalAnimeList instanceof Array) {
    						set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    					}

    					data?.finalAnimeList?.forEach?.((anime, idx) => {
    						set_store_value(
    							newFinalAnime,
    							$newFinalAnime = {
    								id: anime.id,
    								idx: data.shownAnimeListCount + idx,
    								finalAnimeList: anime
    							},
    							$newFinalAnime
    						);
    					});

    					set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries || $hiddenEntries, $hiddenEntries);
    				}

    				set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    				return;
    			}).catch(error => {
    				console.error(error);
    			});
    		}
    	}

    	async function showDataStatus() {
    		if (await $confirmPromise({
    			text: `Do you want ${$showStatus ? "hide" : "show"} the status information in your home page?`,
    			isImportant: true
    		})) {
    			set_store_value(showStatus, $showStatus = !$showStatus, $showStatus);
    		}
    	}

    	async function anilistSignup() {
    		if (await $confirmPromise({
    			text: "Do you want to sign-up an AniList account?",
    			isImportant: true
    		})) {
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

    	async function reload() {
    		if (await $confirmPromise({
    			text: "Do you want to reload the app resources?",
    			isImportant: true
    		})) {
    			if ($android) {
    				try {
    					JSBridge?.callUpdateNotifications?.();
    				} catch(e) {
    					
    				}
    			}

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

    		if (await $confirmPromise({
    			text: "Do you want to refresh the app?",
    			isImportant: true
    		})) {
    			try {
    				JSBridge.refreshWeb();
    			} catch(e) {
    				
    			}
    		}
    	}

    	async function clearCache() {
    		if (!$android) return;

    		if (await $confirmPromise({
    			text: "Do you want to clear your cache to receive the latest application updates?",
    			isImportant: true
    		})) {
    			try {
    				JSBridge.clearCache();
    			} catch(e) {
    				
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Menu> was created with unknown prop '${key}'`);
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
    	const keydown_handler_5 = e => e.key === "Enter" && showDataStatus();
    	const keydown_handler_6 = e => e.key === "Enter" && handleUpdateEveryHour();
    	const keydown_handler_7 = e => e.key === "Enter" && handleExportEveryHour();
    	const keydown_handler_8 = e => e.key === "Enter" && showRecentReleases();
    	const keydown_handler_9 = e => e.key === "Enter" && switchAppMode();
    	const keydown_handler_10 = e => e.key === "Enter" && clearCache();
    	const keydown_handler_11 = e => e.key === "Enter" && refresh();
    	const keydown_handler_12 = e => e.key === "Enter" && reload();
    	const keydown_handler_13 = e => e.key === "Enter" && anilistSignup();

    	const click_handler = e => {
    		if (e.pointerType !== "touch") {
    			handleMenuVisibility(e);
    		}
    	};

    	const keydown_handler_14 = e => e.key === "Enter" && handleMenuVisibility(e);

    	$$self.$capture_state = () => ({
    		android: android$1,
    		menuVisible,
    		hiddenEntries,
    		animeLoaderWorker: animeLoaderWorker$1,
    		finalAnimeList,
    		dataStatus,
    		autoUpdate,
    		autoExport,
    		exportPathIsAvailable,
    		runUpdate,
    		runExport,
    		confirmPromise,
    		importantUpdate,
    		popupVisible,
    		listUpdateAvailable,
    		showStatus,
    		newFinalAnime,
    		fade,
    		saveJSON,
    		importUserData,
    		jsonIsEmpty,
    		removeLocalStorage,
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
    		showDataStatus,
    		anilistSignup,
    		showRecentReleases,
    		switchAppMode,
    		reload,
    		refresh,
    		clearCache,
    		$confirmPromise,
    		$android,
    		$showStatus,
    		$dataStatus,
    		$hiddenEntries,
    		$newFinalAnime,
    		$finalAnimeList,
    		$animeLoaderWorker,
    		$listUpdateAvailable,
    		$menuVisible,
    		$popupVisible,
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
    		$showStatus,
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
    		showDataStatus,
    		anilistSignup,
    		showRecentReleases,
    		switchAppMode,
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
    		click_handler,
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

    const { Object: Object_1$1, console: console_1$1 } = globals;

    const file$2 = "src\\components\\Others\\Search.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[142] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[145] = list[i];
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[163] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[148] = list[i];
    	child_ctx[149] = list;
    	child_ctx[150] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[151] = list[i];
    	child_ctx[153] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[154] = list[i];
    	child_ctx[155] = list;
    	child_ctx[156] = i;
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[157] = list[i];
    	child_ctx[158] = list;
    	child_ctx[159] = i;
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[160] = list[i];
    	child_ctx[162] = i;
    	return child_ctx;
    }

    function get_each_context_8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[148] = list[i];
    	return child_ctx;
    }

    function get_each_context_9(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[168] = list[i];
    	return child_ctx;
    }

    // (2108:8) {#if !editCustomFilterName || !$showFilterOptions}
    function create_if_block_18(ctx) {
    	let div;
    	let div_class_value;
    	let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[10]}px`;
    	let if_block = /*$filterOptions*/ ctx[5] && create_if_block_19(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("options-wrap " + (/*selectedCustomFilterElement*/ ctx[0]
    			? ""
    			: "disable-interaction hide")) + " svelte-the3s7"));

    			set_style(div, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			add_location(div, file$2, 2108, 12, 84506);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*$filterOptions*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_19(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*selectedCustomFilterElement*/ 1 && div_class_value !== (div_class_value = "" + (null_to_empty("options-wrap " + (/*selectedCustomFilterElement*/ ctx[0]
    			? ""
    			: "disable-interaction hide")) + " svelte-the3s7"))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 1024 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[10]}px`)) {
    				set_style(div, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_18.name,
    		type: "if",
    		source: "(2108:8) {#if !editCustomFilterName || !$showFilterOptions}",
    		ctx
    	});

    	return block;
    }

    // (2116:16) {#if $filterOptions}
    function create_if_block_19(ctx) {
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
    	let each_value_9 = /*$customFilters*/ ctx[23] || [];
    	validate_each_argument(each_value_9);
    	const get_key = ctx => /*filterName*/ ctx[168] || {};
    	validate_each_keys(ctx, each_value_9, get_each_context_9, get_key);

    	for (let i = 0; i < each_value_9.length; i += 1) {
    		let child_ctx = get_each_context_9(ctx, each_value_9, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_9(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Your Filters";
    			t1 = space();
    			div0 = element("div");
    			t2 = text("×");
    			t3 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h2, "class", "svelte-the3s7");
    			add_location(h2, file$2, 2121, 28, 85083);
    			attr_dev(div0, "class", "closing-x svelte-the3s7");

    			attr_dev(div0, "tabindex", div0_tabindex_value = /*selectedCustomFilterElement*/ ctx[0] && /*windowWidth*/ ctx[9] <= 425
    			? "0"
    			: "-1");

    			add_location(div0, file$2, 2123, 28, 85218);
    			attr_dev(div1, "class", "header svelte-the3s7");
    			add_location(div1, file$2, 2120, 24, 85033);
    			attr_dev(div2, "class", "options svelte-the3s7");
    			add_location(div2, file$2, 2137, 24, 85890);
    			attr_dev(div3, "class", div3_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedCustomFilterElement*/ ctx[0] ? "" : "hide")) + " svelte-the3s7"));
    			add_location(div3, file$2, 2116, 20, 84844);
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
    					listen_dev(div0, "keydown", /*keydown_handler*/ ctx[66], false, false, false, false),
    					listen_dev(div0, "click", /*handleCustomFilterPopup*/ ctx[47], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedCustomFilterElement, windowWidth*/ 513 && div0_tabindex_value !== (div0_tabindex_value = /*selectedCustomFilterElement*/ ctx[0] && /*windowWidth*/ ctx[9] <= 425
    			? "0"
    			: "-1")) {
    				attr_dev(div0, "tabindex", div0_tabindex_value);
    			}

    			if (dirty[0] & /*$customFilters, $selectedCustomFilter*/ 8388672 | dirty[1] & /*selectCustomFilter*/ 131072) {
    				each_value_9 = /*$customFilters*/ ctx[23] || [];
    				validate_each_argument(each_value_9);
    				validate_each_keys(ctx, each_value_9, get_each_context_9, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_9, each_1_lookup, div2, destroy_block, create_each_block_9, null, get_each_context_9);
    			}

    			if (dirty[0] & /*selectedCustomFilterElement*/ 1 && div3_class_value !== (div3_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedCustomFilterElement*/ ctx[0] ? "" : "hide")) + " svelte-the3s7"))) {
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
    		id: create_if_block_19.name,
    		type: "if",
    		source: "(2116:16) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (2139:28) {#each $customFilters || [] as filterName (filterName || {}
    function create_each_block_9(key_1, ctx) {
    	let div;
    	let h3;
    	let t0_value = (trimAllEmptyChar(/*filterName*/ ctx[168]) || "") + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[67](/*filterName*/ ctx[168], ...args);
    	}

    	function keydown_handler_1(...args) {
    		return /*keydown_handler_1*/ ctx[68](/*filterName*/ ctx[168], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(h3, "class", "svelte-the3s7");

    			set_style(h3, "color", /*filterName*/ ctx[168] === /*$selectedCustomFilter*/ ctx[6]
    			? "#3db4f2"
    			: "inherit");

    			add_location(h3, file$2, 2147, 36, 86489);
    			attr_dev(div, "class", "option svelte-the3s7");
    			add_location(div, file$2, 2139, 32, 86036);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t0);
    			append_dev(div, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", click_handler, false, false, false, false),
    					listen_dev(div, "keydown", keydown_handler_1, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$customFilters*/ 8388608 && t0_value !== (t0_value = (trimAllEmptyChar(/*filterName*/ ctx[168]) || "") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$customFilters, $selectedCustomFilter*/ 8388672) {
    				set_style(h3, "color", /*filterName*/ ctx[168] === /*$selectedCustomFilter*/ ctx[6]
    				? "#3db4f2"
    				: "inherit");
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
    		id: create_each_block_9.name,
    		type: "each",
    		source: "(2139:28) {#each $customFilters || [] as filterName (filterName || {}",
    		ctx
    	});

    	return block;
    }

    // (2163:8) {#if $showFilterOptions}
    function create_if_block_16(ctx) {
    	let t;
    	let div;
    	let svg;
    	let path;
    	let path_d_value;
    	let svg_tabindex_value;
    	let svg_viewBox_value;
    	let mounted;
    	let dispose;
    	let if_block = /*editCustomFilterName*/ ctx[16] && /*customFilterName*/ ctx[19] && /*$selectedCustomFilter*/ ctx[6] && /*$activeTagFilters*/ ctx[7] && !/*$activeTagFilters*/ ctx[7]?.[/*customFilterName*/ ctx[19]] && create_if_block_17(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");

    			attr_dev(path, "d", path_d_value = /*editCustomFilterName*/ ctx[16]
    			? "M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"
    			: "M472 22a56 56 0 0 0-80 0l-30 30 98 98 30-30c22-22 22-58 0-80l-18-18zM172 242c-6 6-10 13-13 22l-30 88a24 24 0 0 0 31 31l89-30c8-3 15-7 21-13l168-168-98-98-168 168zM96 64c-53 0-96 43-96 96v256c0 53 43 96 96 96h256c53 0 96-43 96-96v-96a32 32 0 1 0-64 0v96c0 18-14 32-32 32H96c-18 0-32-14-32-32V160c0-18 14-32 32-32h96a32 32 0 1 0 0-64H96z");

    			attr_dev(path, "class", "svelte-the3s7");
    			add_location(path, file$2, 2219, 20, 90203);
    			attr_dev(svg, "class", "editcancel-custom-name svelte-the3s7");
    			attr_dev(svg, "tabindex", svg_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1");

    			attr_dev(svg, "viewBox", svg_viewBox_value = "0 0" + (/*editCustomFilterName*/ ctx[16]
    			? " 384 512"
    			: " 512 512"));

    			add_location(svg, file$2, 2201, 16, 89299);
    			attr_dev(div, "class", "custom-filter-icon-wrap svelte-the3s7");
    			add_location(div, file$2, 2199, 12, 89172);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "click", /*click_handler_2*/ ctx[71], false, false, false, false),
    					listen_dev(svg, "keydown", /*keydown_handler_3*/ ctx[72], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*editCustomFilterName*/ ctx[16] && /*customFilterName*/ ctx[19] && /*$selectedCustomFilter*/ ctx[6] && /*$activeTagFilters*/ ctx[7] && !/*$activeTagFilters*/ ctx[7]?.[/*customFilterName*/ ctx[19]]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_17(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*editCustomFilterName*/ 65536 && path_d_value !== (path_d_value = /*editCustomFilterName*/ ctx[16]
    			? "M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"
    			: "M472 22a56 56 0 0 0-80 0l-30 30 98 98 30-30c22-22 22-58 0-80l-18-18zM172 242c-6 6-10 13-13 22l-30 88a24 24 0 0 0 31 31l89-30c8-3 15-7 21-13l168-168-98-98-168 168zM96 64c-53 0-96 43-96 96v256c0 53 43 96 96 96h256c53 0 96-43 96-96v-96a32 32 0 1 0-64 0v96c0 18-14 32-32 32H96c-18 0-32-14-32-32V160c0-18 14-32 32-32h96a32 32 0 1 0 0-64H96z")) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty[0] & /*$showFilterOptions*/ 2097152 && svg_tabindex_value !== (svg_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1")) {
    				attr_dev(svg, "tabindex", svg_tabindex_value);
    			}

    			if (dirty[0] & /*editCustomFilterName*/ 65536 && svg_viewBox_value !== (svg_viewBox_value = "0 0" + (/*editCustomFilterName*/ ctx[16]
    			? " 384 512"
    			: " 512 512"))) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(2163:8) {#if $showFilterOptions}",
    		ctx
    	});

    	return block;
    }

    // (2164:12) {#if editCustomFilterName && customFilterName && $selectedCustomFilter && $activeTagFilters && !$activeTagFilters?.[customFilterName]}
    function create_if_block_17(ctx) {
    	let div;
    	let svg;
    	let path;
    	let svg_tabindex_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M48 96v320c0 9 7 16 16 16h320c9 0 16-7 16-16V171c0-5-2-9-5-12l34-34c12 12 19 29 19 46v245c0 35-29 64-64 64H64c-35 0-64-29-64-64V96c0-35 29-64 64-64h246c17 0 33 7 45 19l74 74-34 34-74-74-1-1v100c0 13-11 24-24 24H104c-13 0-24-11-24-24V80H64c-9 0-16 7-16 16zm80-16v80h144V80H128zm32 240a64 64 0 1 1 128 0 64 64 0 1 1-128 0z");
    			attr_dev(path, "class", "svelte-the3s7");
    			add_location(path, file$2, 2193, 24, 88700);
    			attr_dev(svg, "class", "save-custom-name svelte-the3s7");
    			attr_dev(svg, "tabindex", svg_tabindex_value = /*editCustomFilterName*/ ctx[16] ? "0" : "-1");
    			attr_dev(svg, "viewBox", "0 0 448 512");
    			add_location(svg, file$2, 2166, 20, 87429);
    			attr_dev(div, "class", "custom-filter-icon-wrap svelte-the3s7");
    			add_location(div, file$2, 2164, 16, 87294);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "click", /*click_handler_1*/ ctx[69], false, false, false, false),
    					listen_dev(svg, "keydown", /*keydown_handler_2*/ ctx[70], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*editCustomFilterName*/ 65536 && svg_tabindex_value !== (svg_tabindex_value = /*editCustomFilterName*/ ctx[16] ? "0" : "-1")) {
    				attr_dev(svg, "tabindex", svg_tabindex_value);
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
    		id: create_if_block_17.name,
    		type: "if",
    		source: "(2164:12) {#if editCustomFilterName && customFilterName && $selectedCustomFilter && $activeTagFilters && !$activeTagFilters?.[customFilterName]}",
    		ctx
    	});

    	return block;
    }

    // (2338:8) {:else}
    function create_else_block_6(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "skeleton shimmer svelte-the3s7");
    			add_location(div, file$2, 2338, 12, 96564);
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
    		id: create_else_block_6.name,
    		type: "else",
    		source: "(2338:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (2255:8) {#if $filterOptions && !$loadingFilterOptions}
    function create_if_block_14(ctx) {
    	let span;
    	let h2;
    	let t0_value = (/*selectedFilterSelectionName*/ ctx[4] || "") + "";
    	let t0;
    	let t1;
    	let svg;
    	let path;
    	let svg_tabindex_value;
    	let t2;
    	let div;
    	let div_class_value;
    	let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[10]}px`;
    	let mounted;
    	let dispose;
    	let if_block = /*$filterOptions*/ ctx[5] && create_if_block_15(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t2 = space();
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(path, "d", "M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z");
    			attr_dev(path, "class", "svelte-the3s7");
    			add_location(path, file$2, 2272, 24, 93212);
    			attr_dev(svg, "viewBox", "0 140 320 512");

    			attr_dev(svg, "tabindex", svg_tabindex_value = /*$showFilterOptions*/ ctx[21] && !/*selectedFilterTypeElement*/ ctx[1]
    			? "0"
    			: "");

    			attr_dev(svg, "class", "svelte-the3s7");
    			add_location(svg, file$2, 2264, 20, 92884);
    			attr_dev(h2, "class", "filterType-dropdown svelte-the3s7");
    			add_location(h2, file$2, 2262, 16, 92773);

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("options-wrap " + (/*selectedFilterTypeElement*/ ctx[1]
    			? ""
    			: "disable-interaction hide")) + " svelte-the3s7"));

    			set_style(div, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			add_location(div, file$2, 2277, 16, 93439);
    			attr_dev(span, "class", "filterType svelte-the3s7");
    			add_location(span, file$2, 2256, 12, 92545);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, h2);
    			append_dev(h2, t0);
    			append_dev(h2, t1);
    			append_dev(h2, svg);
    			append_dev(svg, path);
    			append_dev(span, t2);
    			append_dev(span, div);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(span, "click", /*handleShowFilterTypes*/ ctx[33], false, false, false, false),
    					listen_dev(span, "keydown", /*keydown_handler_8*/ ctx[78], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedFilterSelectionName*/ 16 && t0_value !== (t0_value = (/*selectedFilterSelectionName*/ ctx[4] || "") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$showFilterOptions, selectedFilterTypeElement*/ 2097154 && svg_tabindex_value !== (svg_tabindex_value = /*$showFilterOptions*/ ctx[21] && !/*selectedFilterTypeElement*/ ctx[1]
    			? "0"
    			: "")) {
    				attr_dev(svg, "tabindex", svg_tabindex_value);
    			}

    			if (/*$filterOptions*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_15(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*selectedFilterTypeElement*/ 2 && div_class_value !== (div_class_value = "" + (null_to_empty("options-wrap " + (/*selectedFilterTypeElement*/ ctx[1]
    			? ""
    			: "disable-interaction hide")) + " svelte-the3s7"))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 1024 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[10]}px`)) {
    				set_style(div, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(2255:8) {#if $filterOptions && !$loadingFilterOptions}",
    		ctx
    	});

    	return block;
    }

    // (2285:20) {#if $filterOptions}
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
    	let each_value_8 = /*$filterOptions*/ ctx[5]?.filterSelection || [];
    	validate_each_argument(each_value_8);
    	const get_key = ctx => /*filterSelection*/ ctx[148]?.filterSelectionName || {};
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

    			attr_dev(h2, "class", "svelte-the3s7");
    			add_location(h2, file$2, 2290, 32, 94064);
    			attr_dev(div0, "class", "closing-x svelte-the3s7");

    			attr_dev(div0, "tabindex", div0_tabindex_value = /*selectedFilterTypeElement*/ ctx[1] && /*windowWidth*/ ctx[9] <= 425
    			? "0"
    			: "-1");

    			add_location(div0, file$2, 2292, 32, 94116);
    			attr_dev(div1, "class", "header svelte-the3s7");
    			add_location(div1, file$2, 2289, 28, 94010);
    			attr_dev(div2, "class", "options svelte-the3s7");
    			add_location(div2, file$2, 2306, 28, 94838);
    			attr_dev(div3, "class", div3_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedFilterTypeElement*/ ctx[1] ? "" : "hide")) + " svelte-the3s7"));
    			add_location(div3, file$2, 2285, 24, 93807);
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
    					listen_dev(div0, "keydown", /*keydown_handler_6*/ ctx[75], false, false, false, false),
    					listen_dev(div0, "click", /*handleShowFilterTypes*/ ctx[33], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedFilterTypeElement, windowWidth*/ 514 && div0_tabindex_value !== (div0_tabindex_value = /*selectedFilterTypeElement*/ ctx[1] && /*windowWidth*/ ctx[9] <= 425
    			? "0"
    			: "-1")) {
    				attr_dev(div0, "tabindex", div0_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 | dirty[1] & /*handleFilterTypes*/ 2) {
    				each_value_8 = /*$filterOptions*/ ctx[5]?.filterSelection || [];
    				validate_each_argument(each_value_8);
    				validate_each_keys(ctx, each_value_8, get_each_context_8, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_8, each_1_lookup, div2, destroy_block, create_each_block_8, null, get_each_context_8);
    			}

    			if (dirty[0] & /*selectedFilterTypeElement*/ 2 && div3_class_value !== (div3_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedFilterTypeElement*/ ctx[1] ? "" : "hide")) + " svelte-the3s7"))) {
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
    		source: "(2285:20) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (2308:32) {#each $filterOptions?.filterSelection || [] as filterSelection (filterSelection?.filterSelectionName || {}
    function create_each_block_8(key_1, ctx) {
    	let div;
    	let h3;
    	let t0_value = (/*filterSelection*/ ctx[148]?.filterSelectionName || "") + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[76](/*filterSelection*/ ctx[148], ...args);
    	}

    	function keydown_handler_7(...args) {
    		return /*keydown_handler_7*/ ctx[77](/*filterSelection*/ ctx[148], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(h3, "class", "svelte-the3s7");

    			set_style(h3, "color", (/*filterSelection*/ ctx[148]?.isSelected)
    			? "#3db4f2"
    			: "inherit");

    			add_location(h3, file$2, 2322, 40, 95867);
    			attr_dev(div, "class", "option svelte-the3s7");
    			add_location(div, file$2, 2308, 36, 95040);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t0);
    			append_dev(div, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", click_handler_3, false, false, false, false),
    					listen_dev(div, "keydown", keydown_handler_7, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$filterOptions*/ 32 && t0_value !== (t0_value = (/*filterSelection*/ ctx[148]?.filterSelectionName || "") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$filterOptions*/ 32) {
    				set_style(h3, "color", (/*filterSelection*/ ctx[148]?.isSelected)
    				? "#3db4f2"
    				: "inherit");
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
    		source: "(2308:32) {#each $filterOptions?.filterSelection || [] as filterSelection (filterSelection?.filterSelectionName || {}",
    		ctx
    	});

    	return block;
    }

    // (2342:8) {#if $showFilterOptions && $customFilters?.length > 1}
    function create_if_block_13(ctx) {
    	let div;
    	let svg;
    	let path;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M432 256c0 18-14 32-32 32H48a32 32 0 1 1 0-64h352c18 0 32 14 32 32z");
    			attr_dev(path, "class", "svelte-the3s7");
    			add_location(path, file$2, 2356, 20, 97386);
    			attr_dev(svg, "class", "filterType-wrap-icon svelte-the3s7");
    			attr_dev(svg, "viewBox", "0 0 448 512");
    			add_location(svg, file$2, 2354, 16, 97272);
    			attr_dev(div, "tabindex", "0");
    			attr_dev(div, "class", "remove-custom-filter svelte-the3s7");
    			attr_dev(div, "title", "Delete Custom Filter");
    			set_style(div, "visibility", /*$customFilters*/ ctx[23]?.length > 1 ? "" : "hidden");
    			add_location(div, file$2, 2342, 12, 96753);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*click_handler_4*/ ctx[79], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_9*/ ctx[80], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$customFilters*/ 8388608) {
    				set_style(div, "visibility", /*$customFilters*/ ctx[23]?.length > 1 ? "" : "hidden");
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
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(2342:8) {#if $showFilterOptions && $customFilters?.length > 1}",
    		ctx
    	});

    	return block;
    }

    // (2364:8) {#if $showFilterOptions && customFilterName && $activeTagFilters && !$activeTagFilters?.[customFilterName]}
    function create_if_block_12(ctx) {
    	let div;
    	let svg;
    	let path;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M256 80a32 32 0 1 0-64 0v144H48a32 32 0 1 0 0 64h144v144a32 32 0 1 0 64 0V288h144a32 32 0 1 0 0-64H256V80z");
    			attr_dev(path, "class", "svelte-the3s7");
    			add_location(path, file$2, 2390, 20, 98749);
    			attr_dev(svg, "class", "filterType-wrap-icon svelte-the3s7");
    			attr_dev(svg, "viewBox", "0 0 448 512");
    			add_location(svg, file$2, 2388, 16, 98637);
    			attr_dev(div, "tabindex", "0");
    			attr_dev(div, "class", "add-custom-filter svelte-the3s7");
    			attr_dev(div, "title", "Add Custom Filter");
    			add_location(div, file$2, 2364, 12, 97766);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*click_handler_5*/ ctx[81], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_10*/ ctx[82], false, false, false, false)
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
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(2364:8) {#if $showFilterOptions && customFilterName && $activeTagFilters && !$activeTagFilters?.[customFilterName]}",
    		ctx
    	});

    	return block;
    }

    // (2830:8) {:else}
    function create_else_block_5(ctx) {
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
    		id: create_else_block_5.name,
    		type: "else",
    		source: "(2830:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (2419:8) {#if $filterOptions && !$loadingFilterOptions}
    function create_if_block_5(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let each_value_2 = /*$filterOptions*/ ctx[5]?.filterSelection || [];
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*filterSelection*/ ctx[148].filterSelectionName || {};
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
    			if (dirty[0] & /*$filterOptions, $showFilterOptions, conditionalInputNumberList, $activeTagFilters, $selectedCustomFilter, Init, maxFilterSelectionHeight, tagCategoryInfo, windowWidth*/ 1075843040 | dirty[1] & /*handleInputNumber, handleCheckboxChange, pleaseWaitAlert, getTagFilterInfoText, handleFilterSelectOptionChange, getTagInfoHTML, getTagCategoryInfoHTML, closeFilterSelect, filterSelect*/ 31457528) {
    				each_value_2 = /*$filterOptions*/ ctx[5]?.filterSelection || [];
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
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(2419:8) {#if $filterOptions && !$loadingFilterOptions}",
    		ctx
    	});

    	return block;
    }

    // (2831:12) {#each Array(10) as _}
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
    			attr_dev(div0, "class", "filter-name skeleton shimmer svelte-the3s7");
    			add_location(div0, file$2, 2832, 20, 126667);
    			attr_dev(div1, "class", "select skeleton shimmer svelte-the3s7");
    			add_location(div1, file$2, 2833, 20, 126733);
    			attr_dev(div2, "class", "filter-select svelte-the3s7");
    			add_location(div2, file$2, 2831, 16, 126618);
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
    		source: "(2831:12) {#each Array(10) as _}",
    		ctx
    	});

    	return block;
    }

    // (2489:28) {:else}
    function create_else_block_4(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M201 343c13 12 33 12 46 0l160-160a32 32 0 0 0-46-46L224 275 87 137a32 32 0 0 0-46 46l160 160z");
    			attr_dev(path, "class", "svelte-the3s7");
    			add_location(path, file$2, 2491, 36, 104038);
    			attr_dev(svg, "class", "angle-down svelte-the3s7");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file$2, 2489, 32, 103897);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_4.name,
    		type: "else",
    		source: "(2489:28) {:else}",
    		ctx
    	});

    	return block;
    }

    // (2475:28) {#if Dropdown.selected && Dropdown.options.length && !Init}
    function create_if_block_11(ctx) {
    	let svg;
    	let path;
    	let mounted;
    	let dispose;

    	function keydown_handler_11(...args) {
    		return /*keydown_handler_11*/ ctx[84](/*dropdownIdx*/ ctx[159], ...args);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z");
    			attr_dev(path, "class", "svelte-the3s7");
    			add_location(path, file$2, 2484, 36, 103602);
    			attr_dev(svg, "class", "angle-up svelte-the3s7");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file$2, 2475, 32, 103087);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "keydown", keydown_handler_11, false, false, false, false),
    					listen_dev(
    						svg,
    						"click",
    						function () {
    							if (is_function(/*closeFilterSelect*/ ctx[35](/*dropdownIdx*/ ctx[159]))) /*closeFilterSelect*/ ctx[35](/*dropdownIdx*/ ctx[159]).apply(this, arguments);
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
    			if (detaching) detach_dev(svg);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(2475:28) {#if Dropdown.selected && Dropdown.options.length && !Init}",
    		ctx
    	});

    	return block;
    }

    // (2709:36) {:else}
    function create_else_block_3(ctx) {
    	let div;
    	let h3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "No Results";
    			attr_dev(h3, "class", "svelte-the3s7");
    			add_location(h3, file$2, 2710, 44, 120006);
    			attr_dev(div, "class", "option svelte-the3s7");
    			add_location(div, file$2, 2709, 40, 119940);
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
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(2709:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (2566:36) {#if Dropdown.options?.filter?.(({ optionName }) => hasPartialMatch(optionName, Dropdown?.optKeyword) || Dropdown?.optKeyword === "")?.length}
    function create_if_block_8(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let each_value_6 = /*Dropdown*/ ctx[157].options || [];
    	validate_each_argument(each_value_6);
    	const get_key = ctx => /*filterSelection*/ ctx[148].filterSelectionName + /*Dropdown*/ ctx[157].filName + /*option*/ ctx[160].optionName || {};
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
    			if (dirty[0] & /*$filterOptions, tagCategoryInfo*/ 2080 | dirty[1] & /*getTagFilterInfoText, handleFilterSelectOptionChange, getTagInfoHTML, getTagCategoryInfoHTML*/ 14680096) {
    				each_value_6 = /*Dropdown*/ ctx[157].options || [];
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
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(2566:36) {#if Dropdown.options?.filter?.(({ optionName }) => hasPartialMatch(optionName, Dropdown?.optKeyword) || Dropdown?.optKeyword === \\\"\\\")?.length}",
    		ctx
    	});

    	return block;
    }

    // (2619:48) {#if option.selected === "included" || (option.selected === "excluded" && Dropdown.changeType !== "read")}
    function create_if_block_10(ctx) {
    	let svg;
    	let path;
    	let path_d_value;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "class", "item-info-path svelte-the3s7");

    			attr_dev(path, "d", path_d_value = /*option*/ ctx[160].selected === "excluded" || /*filterSelection*/ ctx[148].filterSelectionName === "Content Caution"
    			? // circle-xmark
    				"M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-81-337c-9 9-9 25 0 34l47 47-47 47c-9 9-9 24 0 34s25 9 34 0l47-47 47 47c9 9 24 9 34 0s9-25 0-34l-47-47 47-47c9-10 9-25 0-34s-25-9-34 0l-47 47-47-47c-10-9-25-9-34 0z"
    			: // circle-check
    				"M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm113-303c9-9 9-25 0-34s-25-9-34 0L224 286l-47-47c-9-9-24-9-34 0s-9 25 0 34l64 64c10 9 25 9 34 0l128-128z");

    			add_location(path, file$2, 2629, 56, 113074);
    			attr_dev(svg, "class", "item-info svelte-the3s7");
    			attr_dev(svg, "viewBox", "0 0 512 512");

    			set_style(svg, "--optionColor", /*option*/ ctx[160].selected === "included"
    			? // green
    				"#5f9ea0"
    			: // red
    				"#e85d75");

    			add_location(svg, file$2, 2619, 52, 112348);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$filterOptions*/ 32 && path_d_value !== (path_d_value = /*option*/ ctx[160].selected === "excluded" || /*filterSelection*/ ctx[148].filterSelectionName === "Content Caution"
    			? // circle-xmark
    				"M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-81-337c-9 9-9 25 0 34l47 47-47 47c-9 9-9 24 0 34s25 9 34 0l47-47 47 47c9 9 24 9 34 0s9-25 0-34l-47-47 47-47c9-10 9-25 0-34s-25-9-34 0l-47 47-47-47c-10-9-25-9-34 0z"
    			: // circle-check
    				"M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm113-303c9-9 9-25 0-34s-25-9-34 0L224 286l-47-47c-9-9-24-9-34 0s-9 25 0 34l64 64c10 9 25 9 34 0l128-128z")) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32) {
    				set_style(svg, "--optionColor", /*option*/ ctx[160].selected === "included"
    				? // green
    					"#5f9ea0"
    				: // red
    					"#e85d75");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(2619:48) {#if option.selected === \\\"included\\\" || (option.selected === \\\"excluded\\\" && Dropdown.changeType !== \\\"read\\\")}",
    		ctx
    	});

    	return block;
    }

    // (2643:48) {#if typeof window?.showFullScreenInfo === "function" && ((Dropdown?.filName === "tag" && getTagFilterInfoText({ tag: option?.optionName }, "category and description")) || (Dropdown.filName === "tag category" && !jsonIsEmpty(tagCategoryInfo?.[option?.optionName])))}
    function create_if_block_9(ctx) {
    	let svg;
    	let path;
    	let mounted;
    	let dispose;

    	function click_handler_7() {
    		return /*click_handler_7*/ ctx[89](/*Dropdown*/ ctx[157], /*option*/ ctx[160]);
    	}

    	function keydown_handler_14(...args) {
    		return /*keydown_handler_14*/ ctx[90](/*Dropdown*/ ctx[157], /*option*/ ctx[160], ...args);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "class", "item-info-path svelte-the3s7");
    			attr_dev(path, "d", "M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-40-176h24v-64h-24a24 24 0 1 1 0-48h48c13 0 24 11 24 24v88h8a24 24 0 1 1 0 48h-80a24 24 0 1 1 0-48zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z");
    			add_location(path, file$2, 2700, 57, 119231);
    			attr_dev(svg, "class", "extra-item-info svelte-the3s7");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file$2, 2643, 52, 114821);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "click", stop_propagation(click_handler_7), false, false, true, false),
    					listen_dev(svg, "keydown", stop_propagation(keydown_handler_14), false, false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(2643:48) {#if typeof window?.showFullScreenInfo === \\\"function\\\" && ((Dropdown?.filName === \\\"tag\\\" && getTagFilterInfoText({ tag: option?.optionName }, \\\"category and description\\\")) || (Dropdown.filName === \\\"tag category\\\" && !jsonIsEmpty(tagCategoryInfo?.[option?.optionName])))}",
    		ctx
    	});

    	return block;
    }

    // (2567:40) {#each Dropdown.options || [] as option, optionIdx (filterSelection.filterSelectionName + Dropdown.filName + option.optionName || {}
    function create_each_block_6(key_1, ctx) {
    	let div;
    	let h3;
    	let t0_value = (/*option*/ ctx[160].optionName || "") + "";
    	let t0;
    	let t1;
    	let t2;
    	let show_if = typeof window?.showFullScreenInfo === "function" && (/*Dropdown*/ ctx[157]?.filName === "tag" && /*getTagFilterInfoText*/ ctx[52]({ tag: /*option*/ ctx[160]?.optionName }, "category and description") || /*Dropdown*/ ctx[157].filName === "tag category" && !jsonIsEmpty(/*tagCategoryInfo*/ ctx[11]?.[/*option*/ ctx[160]?.optionName]));
    	let div_title_value;
    	let div_class_value;
    	let mounted;
    	let dispose;
    	let if_block0 = (/*option*/ ctx[160].selected === "included" || /*option*/ ctx[160].selected === "excluded" && /*Dropdown*/ ctx[157].changeType !== "read") && create_if_block_10(ctx);
    	let if_block1 = show_if && create_if_block_9(ctx);

    	function keydown_handler_15(...args) {
    		return /*keydown_handler_15*/ ctx[91](/*option*/ ctx[160], /*Dropdown*/ ctx[157], /*optionIdx*/ ctx[162], /*dropdownIdx*/ ctx[159], /*filterSelection*/ ctx[148], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(h3, "class", "svelte-the3s7");
    			add_location(h3, file$2, 2615, 48, 112000);

    			attr_dev(div, "title", div_title_value = /*getTagFilterInfoText*/ ctx[52](
    				/*Dropdown*/ ctx[157].filName === "tag category"
    				? {
    						category: /*option*/ ctx[160]?.optionName
    					}
    				: /*Dropdown*/ ctx[157].filName === "tag"
    					? { tag: /*option*/ ctx[160]?.optionName }
    					: {},
    				/*Dropdown*/ ctx[157].filName === "tag category"
    				? "all tags"
    				: /*Dropdown*/ ctx[157].filName === "tag"
    					? "category and description"
    					: ""
    			) || "");

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("option " + (hasPartialMatch(/*option*/ ctx[160].optionName, /*Dropdown*/ ctx[157].optKeyword)
    			? ""
    			: "disable-interaction")) + " svelte-the3s7"));

    			add_location(div, file$2, 2567, 44, 108574);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t0);
    			append_dev(div, t1);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t2);
    			if (if_block1) if_block1.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						div,
    						"click",
    						function () {
    							if (is_function(/*handleFilterSelectOptionChange*/ ctx[36](/*option*/ ctx[160].optionName, /*Dropdown*/ ctx[157].filName, /*optionIdx*/ ctx[162], /*dropdownIdx*/ ctx[159], /*Dropdown*/ ctx[157].changeType, /*filterSelection*/ ctx[148].filterSelectionName))) /*handleFilterSelectOptionChange*/ ctx[36](/*option*/ ctx[160].optionName, /*Dropdown*/ ctx[157].filName, /*optionIdx*/ ctx[162], /*dropdownIdx*/ ctx[159], /*Dropdown*/ ctx[157].changeType, /*filterSelection*/ ctx[148].filterSelectionName).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(div, "keydown", keydown_handler_15, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$filterOptions*/ 32 && t0_value !== (t0_value = (/*option*/ ctx[160].optionName || "") + "")) set_data_dev(t0, t0_value);

    			if (/*option*/ ctx[160].selected === "included" || /*option*/ ctx[160].selected === "excluded" && /*Dropdown*/ ctx[157].changeType !== "read") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_10(ctx);
    					if_block0.c();
    					if_block0.m(div, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*$filterOptions, tagCategoryInfo*/ 2080) show_if = typeof window?.showFullScreenInfo === "function" && (/*Dropdown*/ ctx[157]?.filName === "tag" && /*getTagFilterInfoText*/ ctx[52]({ tag: /*option*/ ctx[160]?.optionName }, "category and description") || /*Dropdown*/ ctx[157].filName === "tag category" && !jsonIsEmpty(/*tagCategoryInfo*/ ctx[11]?.[/*option*/ ctx[160]?.optionName]));

    			if (show_if) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_9(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && div_title_value !== (div_title_value = /*getTagFilterInfoText*/ ctx[52](
    				/*Dropdown*/ ctx[157].filName === "tag category"
    				? {
    						category: /*option*/ ctx[160]?.optionName
    					}
    				: /*Dropdown*/ ctx[157].filName === "tag"
    					? { tag: /*option*/ ctx[160]?.optionName }
    					: {},
    				/*Dropdown*/ ctx[157].filName === "tag category"
    				? "all tags"
    				: /*Dropdown*/ ctx[157].filName === "tag"
    					? "category and description"
    					: ""
    			) || "")) {
    				attr_dev(div, "title", div_title_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && div_class_value !== (div_class_value = "" + (null_to_empty("option " + (hasPartialMatch(/*option*/ ctx[160].optionName, /*Dropdown*/ ctx[157].optKeyword)
    			? ""
    			: "disable-interaction")) + " svelte-the3s7"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(2567:40) {#each Dropdown.options || [] as option, optionIdx (filterSelection.filterSelectionName + Dropdown.filName + option.optionName || {}",
    		ctx
    	});

    	return block;
    }

    // (2421:16) {#each filterSelection.filters.Dropdown || [] as Dropdown, dropdownIdx (filterSelection.filterSelectionName + Dropdown.filName || {}
    function create_each_block_5(key_1, ctx) {
    	let div8;
    	let div0;
    	let h20;
    	let t0_value = (/*Dropdown*/ ctx[157].filName || "") + "";
    	let t0;
    	let t1;
    	let div2;
    	let div1;
    	let label0;
    	let t2_value = /*filterSelection*/ ctx[148].filterSelectionName + " " + /*Dropdown*/ ctx[157].filName + "";
    	let t2;
    	let label0_for_value;
    	let t3;
    	let input0;
    	let input0_tabindex_value;
    	let input0_id_value;
    	let input0_disabled_value;
    	let t4;
    	let div2_tabindex_value;
    	let t5;
    	let div7;
    	let div6;
    	let div4;
    	let h21;
    	let t6_value = /*Dropdown*/ ctx[157].filName + "";
    	let t6;
    	let t7;
    	let div3;
    	let t8;
    	let div3_tabindex_value;
    	let t9;
    	let label1;
    	let t10_value = "Search " + /*filterSelection*/ ctx[148].filterSelectionName + " " + /*Dropdown*/ ctx[157].filName + "";
    	let t10;
    	let label1_for_value;
    	let t11;
    	let input1;
    	let input1_tabindex_value;
    	let input1_id_value;
    	let input1_disabled_value;
    	let t12;
    	let div5;
    	let show_if;
    	let div6_class_value;
    	let div7_class_value;
    	let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[10]}px`;
    	let div8_class_value;
    	let mounted;
    	let dispose;

    	function func(...args) {
    		return /*func*/ ctx[64](/*Dropdown*/ ctx[157], ...args);
    	}

    	function input0_input_handler_1() {
    		/*input0_input_handler_1*/ ctx[83].call(input0, /*filSelIdx*/ ctx[150], /*dropdownIdx*/ ctx[159]);
    	}

    	function select_block_type_2(ctx, dirty) {
    		if (/*Dropdown*/ ctx[157].selected && /*Dropdown*/ ctx[157].options.length && !/*Init*/ ctx[8]) return create_if_block_11;
    		return create_else_block_4;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block0 = current_block_type(ctx);

    	function keydown_handler_12(...args) {
    		return /*keydown_handler_12*/ ctx[85](/*dropdownIdx*/ ctx[159], ...args);
    	}

    	function click_handler_6(...args) {
    		return /*click_handler_6*/ ctx[86](/*dropdownIdx*/ ctx[159], ...args);
    	}

    	function keydown_handler_13(...args) {
    		return /*keydown_handler_13*/ ctx[87](/*dropdownIdx*/ ctx[159], ...args);
    	}

    	function input1_input_handler() {
    		/*input1_input_handler*/ ctx[88].call(input1, /*filSelIdx*/ ctx[150], /*dropdownIdx*/ ctx[159]);
    	}

    	function select_block_type_3(ctx, dirty) {
    		if (dirty[0] & /*$filterOptions*/ 32) show_if = null;
    		if (show_if == null) show_if = !!/*Dropdown*/ ctx[157].options?.filter?.(func)?.length;
    		if (show_if) return create_if_block_8;
    		return create_else_block_3;
    	}

    	let current_block_type_1 = select_block_type_3(ctx, [-1, -1, -1, -1, -1, -1]);
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
    			label0 = element("label");
    			t2 = text(t2_value);
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			if_block0.c();
    			t5 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div4 = element("div");
    			h21 = element("h2");
    			t6 = text(t6_value);
    			t7 = space();
    			div3 = element("div");
    			t8 = text("×");
    			t9 = space();
    			label1 = element("label");
    			t10 = text(t10_value);
    			t11 = space();
    			input1 = element("input");
    			t12 = space();
    			div5 = element("div");
    			if_block1.c();
    			attr_dev(h20, "class", "svelte-the3s7");
    			add_location(h20, file$2, 2428, 28, 100455);
    			attr_dev(div0, "class", "filter-name svelte-the3s7");
    			add_location(div0, file$2, 2427, 24, 100400);
    			attr_dev(label0, "class", "disable-interaction svelte-the3s7");
    			attr_dev(label0, "for", label0_for_value = /*filterSelection*/ ctx[148].filterSelectionName + /*Dropdown*/ ctx[157].filName);
    			add_location(label0, file$2, 2448, 32, 101469);
    			attr_dev(input0, "tabindex", input0_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1");
    			attr_dev(input0, "id", input0_id_value = /*filterSelection*/ ctx[148].filterSelectionName + /*Dropdown*/ ctx[157].filName);
    			attr_dev(input0, "placeholder", "Any");
    			attr_dev(input0, "type", "search");
    			attr_dev(input0, "enterkeyhint", "search");
    			attr_dev(input0, "autocomplete", "off");
    			attr_dev(input0, "class", "" + (null_to_empty("value-input") + " svelte-the3s7"));
    			input0.disabled = input0_disabled_value = !/*$showFilterOptions*/ ctx[21] || /*windowWidth*/ ctx[9] <= 425 || !/*filterSelection*/ ctx[148].isSelected;
    			add_location(input0, file$2, 2457, 32, 101972);
    			attr_dev(div1, "class", "value-wrap svelte-the3s7");
    			add_location(div1, file$2, 2447, 28, 101411);
    			attr_dev(div2, "class", "select svelte-the3s7");

    			attr_dev(div2, "tabindex", div2_tabindex_value = /*$showFilterOptions*/ ctx[21] && /*windowWidth*/ ctx[9] <= 425 && /*filterSelection*/ ctx[148].isSelected
    			? "0"
    			: "-1");

    			add_location(div2, file$2, 2431, 24, 100626);
    			attr_dev(h21, "class", "svelte-the3s7");
    			add_location(h21, file$2, 2516, 36, 105371);
    			attr_dev(div3, "class", "closing-x svelte-the3s7");

    			attr_dev(div3, "tabindex", div3_tabindex_value = /*$showFilterOptions*/ ctx[21] && /*Dropdown*/ ctx[157].selected
    			? "0"
    			: "-1");

    			add_location(div3, file$2, 2518, 36, 105528);
    			attr_dev(div4, "class", "header svelte-the3s7");
    			add_location(div4, file$2, 2515, 32, 105313);
    			attr_dev(label1, "class", "disable-interaction svelte-the3s7");
    			attr_dev(label1, "for", label1_for_value = "Search " + (/*filterSelection*/ ctx[148].filterSelectionName + /*Dropdown*/ ctx[157].filName));
    			add_location(label1, file$2, 2534, 32, 106402);
    			attr_dev(input1, "tabindex", input1_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1");
    			attr_dev(input1, "id", input1_id_value = "Search " + (/*filterSelection*/ ctx[148].filterSelectionName + /*Dropdown*/ ctx[157].filName));
    			attr_dev(input1, "placeholder", "Any");
    			attr_dev(input1, "type", "search");
    			attr_dev(input1, "enterkeyhint", "search");
    			attr_dev(input1, "autocomplete", "off");
    			input1.disabled = input1_disabled_value = !/*$showFilterOptions*/ ctx[21] || !/*filterSelection*/ ctx[148].isSelected || !/*Dropdown*/ ctx[157].selected;
    			attr_dev(input1, "class", "svelte-the3s7");
    			add_location(input1, file$2, 2545, 32, 107017);
    			attr_dev(div5, "class", "options svelte-the3s7");
    			add_location(div5, file$2, 2561, 32, 108007);

    			attr_dev(div6, "class", div6_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*Dropdown*/ ctx[157].options.length && /*Dropdown*/ ctx[157].selected === true && !/*Init*/ ctx[8]
    			? ""
    			: "hide")) + " svelte-the3s7"));

    			add_location(div6, file$2, 2507, 28, 104901);

    			attr_dev(div7, "class", div7_class_value = "" + (null_to_empty("options-wrap " + (/*Dropdown*/ ctx[157].options.length && /*Dropdown*/ ctx[157].selected === true && !/*Init*/ ctx[8]
    			? ""
    			: "disable-interaction hide")) + " svelte-the3s7"));

    			set_style(div7, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			add_location(div7, file$2, 2497, 24, 104355);

    			attr_dev(div8, "class", div8_class_value = "" + (null_to_empty("filter-select " + (/*filterSelection*/ ctx[148].isSelected
    			? ""
    			: "disable-interaction")) + " svelte-the3s7"));

    			add_location(div8, file$2, 2421, 20, 100142);
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
    			append_dev(div1, label0);
    			append_dev(label0, t2);
    			append_dev(div1, t3);
    			append_dev(div1, input0);
    			set_input_value(input0, /*$filterOptions*/ ctx[5].filterSelection[/*filSelIdx*/ ctx[150]].filters.Dropdown[/*dropdownIdx*/ ctx[159]].optKeyword);
    			append_dev(div2, t4);
    			if_block0.m(div2, null);
    			append_dev(div8, t5);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div4, h21);
    			append_dev(h21, t6);
    			append_dev(div4, t7);
    			append_dev(div4, div3);
    			append_dev(div3, t8);
    			append_dev(div6, t9);
    			append_dev(div6, label1);
    			append_dev(label1, t10);
    			append_dev(div6, t11);
    			append_dev(div6, input1);
    			set_input_value(input1, /*$filterOptions*/ ctx[5].filterSelection[/*filSelIdx*/ ctx[150]].filters.Dropdown[/*dropdownIdx*/ ctx[159]].optKeyword);
    			append_dev(div6, t12);
    			append_dev(div6, div5);
    			if_block1.m(div5, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", input0_input_handler_1),
    					listen_dev(div2, "keydown", keydown_handler_12, false, false, false, false),
    					listen_dev(div2, "click", click_handler_6, false, false, false, false),
    					listen_dev(div3, "keydown", keydown_handler_13, false, false, false, false),
    					listen_dev(
    						div3,
    						"click",
    						function () {
    							if (is_function(/*closeFilterSelect*/ ctx[35](/*dropdownIdx*/ ctx[159]))) /*closeFilterSelect*/ ctx[35](/*dropdownIdx*/ ctx[159]).apply(this, arguments);
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
    			if (dirty[0] & /*$filterOptions*/ 32 && t0_value !== (t0_value = (/*Dropdown*/ ctx[157].filName || "") + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*$filterOptions*/ 32 && t2_value !== (t2_value = /*filterSelection*/ ctx[148].filterSelectionName + " " + /*Dropdown*/ ctx[157].filName + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*$filterOptions*/ 32 && label0_for_value !== (label0_for_value = /*filterSelection*/ ctx[148].filterSelectionName + /*Dropdown*/ ctx[157].filName)) {
    				attr_dev(label0, "for", label0_for_value);
    			}

    			if (dirty[0] & /*$showFilterOptions*/ 2097152 && input0_tabindex_value !== (input0_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1")) {
    				attr_dev(input0, "tabindex", input0_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && input0_id_value !== (input0_id_value = /*filterSelection*/ ctx[148].filterSelectionName + /*Dropdown*/ ctx[157].filName)) {
    				attr_dev(input0, "id", input0_id_value);
    			}

    			if (dirty[0] & /*$showFilterOptions, windowWidth, $filterOptions*/ 2097696 && input0_disabled_value !== (input0_disabled_value = !/*$showFilterOptions*/ ctx[21] || /*windowWidth*/ ctx[9] <= 425 || !/*filterSelection*/ ctx[148].isSelected)) {
    				prop_dev(input0, "disabled", input0_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && input0.value !== /*$filterOptions*/ ctx[5].filterSelection[/*filSelIdx*/ ctx[150]].filters.Dropdown[/*dropdownIdx*/ ctx[159]].optKeyword) {
    				set_input_value(input0, /*$filterOptions*/ ctx[5].filterSelection[/*filSelIdx*/ ctx[150]].filters.Dropdown[/*dropdownIdx*/ ctx[159]].optKeyword);
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div2, null);
    				}
    			}

    			if (dirty[0] & /*$showFilterOptions, windowWidth, $filterOptions*/ 2097696 && div2_tabindex_value !== (div2_tabindex_value = /*$showFilterOptions*/ ctx[21] && /*windowWidth*/ ctx[9] <= 425 && /*filterSelection*/ ctx[148].isSelected
    			? "0"
    			: "-1")) {
    				attr_dev(div2, "tabindex", div2_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && t6_value !== (t6_value = /*Dropdown*/ ctx[157].filName + "")) set_data_dev(t6, t6_value);

    			if (dirty[0] & /*$showFilterOptions, $filterOptions*/ 2097184 && div3_tabindex_value !== (div3_tabindex_value = /*$showFilterOptions*/ ctx[21] && /*Dropdown*/ ctx[157].selected
    			? "0"
    			: "-1")) {
    				attr_dev(div3, "tabindex", div3_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && t10_value !== (t10_value = "Search " + /*filterSelection*/ ctx[148].filterSelectionName + " " + /*Dropdown*/ ctx[157].filName + "")) set_data_dev(t10, t10_value);

    			if (dirty[0] & /*$filterOptions*/ 32 && label1_for_value !== (label1_for_value = "Search " + (/*filterSelection*/ ctx[148].filterSelectionName + /*Dropdown*/ ctx[157].filName))) {
    				attr_dev(label1, "for", label1_for_value);
    			}

    			if (dirty[0] & /*$showFilterOptions*/ 2097152 && input1_tabindex_value !== (input1_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1")) {
    				attr_dev(input1, "tabindex", input1_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && input1_id_value !== (input1_id_value = "Search " + (/*filterSelection*/ ctx[148].filterSelectionName + /*Dropdown*/ ctx[157].filName))) {
    				attr_dev(input1, "id", input1_id_value);
    			}

    			if (dirty[0] & /*$showFilterOptions, $filterOptions*/ 2097184 && input1_disabled_value !== (input1_disabled_value = !/*$showFilterOptions*/ ctx[21] || !/*filterSelection*/ ctx[148].isSelected || !/*Dropdown*/ ctx[157].selected)) {
    				prop_dev(input1, "disabled", input1_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && input1.value !== /*$filterOptions*/ ctx[5].filterSelection[/*filSelIdx*/ ctx[150]].filters.Dropdown[/*dropdownIdx*/ ctx[159]].optKeyword) {
    				set_input_value(input1, /*$filterOptions*/ ctx[5].filterSelection[/*filSelIdx*/ ctx[150]].filters.Dropdown[/*dropdownIdx*/ ctx[159]].optKeyword);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_3(ctx, dirty)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div5, null);
    				}
    			}

    			if (dirty[0] & /*$filterOptions, Init*/ 288 && div6_class_value !== (div6_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*Dropdown*/ ctx[157].options.length && /*Dropdown*/ ctx[157].selected === true && !/*Init*/ ctx[8]
    			? ""
    			: "hide")) + " svelte-the3s7"))) {
    				attr_dev(div6, "class", div6_class_value);
    			}

    			if (dirty[0] & /*$filterOptions, Init*/ 288 && div7_class_value !== (div7_class_value = "" + (null_to_empty("options-wrap " + (/*Dropdown*/ ctx[157].options.length && /*Dropdown*/ ctx[157].selected === true && !/*Init*/ ctx[8]
    			? ""
    			: "disable-interaction hide")) + " svelte-the3s7"))) {
    				attr_dev(div7, "class", div7_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 1024 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[10]}px`)) {
    				set_style(div7, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && div8_class_value !== (div8_class_value = "" + (null_to_empty("filter-select " + (/*filterSelection*/ ctx[148].isSelected
    			? ""
    			: "disable-interaction")) + " svelte-the3s7"))) {
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
    		source: "(2421:16) {#each filterSelection.filters.Dropdown || [] as Dropdown, dropdownIdx (filterSelection.filterSelectionName + Dropdown.filName || {}",
    		ctx
    	});

    	return block;
    }

    // (2720:20) {#if filterSelection.isSelected}
    function create_if_block_7(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div2;
    	let label;
    	let t1_value = /*Checkbox*/ ctx[154].filName + "";
    	let t1;
    	let label_for_value;
    	let t2;
    	let input;
    	let input_tabindex_value;
    	let input_id_value;
    	let input_disabled_value;
    	let t3;
    	let div1;
    	let t4_value = (/*Checkbox*/ ctx[154].filName || "") + "";
    	let t4;
    	let mounted;
    	let dispose;

    	function change_handler(...args) {
    		return /*change_handler*/ ctx[92](/*Checkbox*/ ctx[154], /*checkboxIdx*/ ctx[156], /*filterSelection*/ ctx[148], ...args);
    	}

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[93].call(input, /*each_value_4*/ ctx[155], /*checkboxIdx*/ ctx[156]);
    	}

    	function click_handler_8(...args) {
    		return /*click_handler_8*/ ctx[94](/*Checkbox*/ ctx[154], /*checkboxIdx*/ ctx[156], /*filterSelection*/ ctx[148], ...args);
    	}

    	function keydown_handler_16(...args) {
    		return /*keydown_handler_16*/ ctx[95](/*Checkbox*/ ctx[154], /*checkboxIdx*/ ctx[156], /*filterSelection*/ ctx[148], ...args);
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			label = element("label");
    			t1 = text(t1_value);
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			div1 = element("div");
    			t4 = text(t4_value);
    			attr_dev(div0, "class", "svelte-the3s7");
    			set_style(div0, "visibility", `none`);
    			add_location(div0, file$2, 2721, 28, 120568);
    			attr_dev(label, "class", "disable-interaction svelte-the3s7");
    			attr_dev(label, "for", label_for_value = "Checkbox: " + /*Checkbox*/ ctx[154].filName);
    			add_location(label, file$2, 2740, 32, 121581);
    			attr_dev(input, "tabindex", input_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1");
    			attr_dev(input, "id", input_id_value = "Checkbox: " + /*Checkbox*/ ctx[154].filName);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "checkbox svelte-the3s7");
    			input.disabled = input_disabled_value = !/*$showFilterOptions*/ ctx[21];
    			add_location(input, file$2, 2746, 32, 121894);
    			attr_dev(div1, "class", "checkbox-label svelte-the3s7");
    			add_location(div1, file$2, 2770, 32, 123310);
    			attr_dev(div2, "class", "checkbox-wrap svelte-the3s7");
    			add_location(div2, file$2, 2722, 28, 120629);
    			attr_dev(div3, "class", "filter-checkbox svelte-the3s7");
    			add_location(div3, file$2, 2720, 24, 120509);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, label);
    			append_dev(label, t1);
    			append_dev(div2, t2);
    			append_dev(div2, input);
    			input.checked = /*Checkbox*/ ctx[154].isSelected;
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, t4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", change_handler, false, false, false, false),
    					listen_dev(input, "change", input_change_handler),
    					listen_dev(div2, "click", click_handler_8, false, false, false, false),
    					listen_dev(div2, "keydown", keydown_handler_16, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$filterOptions*/ 32 && t1_value !== (t1_value = /*Checkbox*/ ctx[154].filName + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*$filterOptions*/ 32 && label_for_value !== (label_for_value = "Checkbox: " + /*Checkbox*/ ctx[154].filName)) {
    				attr_dev(label, "for", label_for_value);
    			}

    			if (dirty[0] & /*$showFilterOptions*/ 2097152 && input_tabindex_value !== (input_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1")) {
    				attr_dev(input, "tabindex", input_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && input_id_value !== (input_id_value = "Checkbox: " + /*Checkbox*/ ctx[154].filName)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty[0] & /*$showFilterOptions*/ 2097152 && input_disabled_value !== (input_disabled_value = !/*$showFilterOptions*/ ctx[21])) {
    				prop_dev(input, "disabled", input_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32) {
    				input.checked = /*Checkbox*/ ctx[154].isSelected;
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && t4_value !== (t4_value = (/*Checkbox*/ ctx[154].filName || "") + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(2720:20) {#if filterSelection.isSelected}",
    		ctx
    	});

    	return block;
    }

    // (2719:16) {#each filterSelection.filters.Checkbox || [] as Checkbox, checkboxIdx (filterSelection.filterSelectionName + Checkbox.filName || {}
    function create_each_block_4(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = /*filterSelection*/ ctx[148].isSelected && create_if_block_7(ctx);

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

    			if (/*filterSelection*/ ctx[148].isSelected) {
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
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(2719:16) {#each filterSelection.filters.Checkbox || [] as Checkbox, checkboxIdx (filterSelection.filterSelectionName + Checkbox.filName || {}",
    		ctx
    	});

    	return block;
    }

    // (2779:20) {#if filterSelection.isSelected}
    function create_if_block_6(ctx) {
    	let div2;
    	let div0;
    	let h2;
    	let t0_value = (/*inputNum*/ ctx[151].filName || "") + "";
    	let t0;
    	let t1;
    	let div1;
    	let label;
    	let t2_value = "Number Filter: " + /*inputNum*/ ctx[151].filName + "";
    	let t2;
    	let label_for_value;
    	let t3;
    	let input;
    	let input_tabindex_value;
    	let input_id_value;
    	let input_placeholder_value;
    	let input_value_value;
    	let input_disabled_value;
    	let t4;
    	let mounted;
    	let dispose;

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[96](/*inputNumIdx*/ ctx[153], /*inputNum*/ ctx[151], /*filterSelection*/ ctx[148], ...args);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			label = element("label");
    			t2 = text(t2_value);
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			attr_dev(h2, "class", "svelte-the3s7");
    			add_location(h2, file$2, 2786, 32, 124141);
    			attr_dev(div0, "class", "filter-input-number-name svelte-the3s7");
    			add_location(div0, file$2, 2785, 28, 124069);
    			attr_dev(label, "class", "disable-interaction svelte-the3s7");
    			attr_dev(label, "for", label_for_value = "Number Filter: " + /*inputNum*/ ctx[151].filName);
    			add_location(label, file$2, 2789, 32, 124311);
    			attr_dev(input, "tabindex", input_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1");
    			attr_dev(input, "id", input_id_value = "Number Filter: " + /*inputNum*/ ctx[151].filName);
    			attr_dev(input, "class", "value-input-number svelte-the3s7");
    			attr_dev(input, "type", "text");

    			attr_dev(input, "placeholder", input_placeholder_value = /*inputNum*/ ctx[151].filName === "scoring system"
    			? "Default: User Scoring"
    			: /*conditionalInputNumberList*/ ctx[30].includes(/*inputNum*/ ctx[151].filName)
    				? ">123 or 123"
    				: /*inputNum*/ ctx[151].defaultValue !== null
    					? "Default: " + /*inputNum*/ ctx[151].defaultValue
    					: "123");

    			input.value = input_value_value = /*inputNum*/ ctx[151].numberValue || "";
    			input.disabled = input_disabled_value = !/*$showFilterOptions*/ ctx[21];
    			add_location(input, file$2, 2795, 32, 124649);
    			attr_dev(div1, "class", "value-input-number-wrap svelte-the3s7");
    			add_location(div1, file$2, 2788, 28, 124240);
    			attr_dev(div2, "class", "filter-input-number svelte-the3s7");
    			set_style(div2, "display", /*filterSelection*/ ctx[148].isSelected ? "" : "none");
    			add_location(div2, file$2, 2779, 24, 123799);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, label);
    			append_dev(label, t2);
    			append_dev(div1, t3);
    			append_dev(div1, input);
    			append_dev(div2, t4);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", input_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$filterOptions*/ 32 && t0_value !== (t0_value = (/*inputNum*/ ctx[151].filName || "") + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*$filterOptions*/ 32 && t2_value !== (t2_value = "Number Filter: " + /*inputNum*/ ctx[151].filName + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*$filterOptions*/ 32 && label_for_value !== (label_for_value = "Number Filter: " + /*inputNum*/ ctx[151].filName)) {
    				attr_dev(label, "for", label_for_value);
    			}

    			if (dirty[0] & /*$showFilterOptions*/ 2097152 && input_tabindex_value !== (input_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1")) {
    				attr_dev(input, "tabindex", input_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && input_id_value !== (input_id_value = "Number Filter: " + /*inputNum*/ ctx[151].filName)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && input_placeholder_value !== (input_placeholder_value = /*inputNum*/ ctx[151].filName === "scoring system"
    			? "Default: User Scoring"
    			: /*conditionalInputNumberList*/ ctx[30].includes(/*inputNum*/ ctx[151].filName)
    				? ">123 or 123"
    				: /*inputNum*/ ctx[151].defaultValue !== null
    					? "Default: " + /*inputNum*/ ctx[151].defaultValue
    					: "123")) {
    				attr_dev(input, "placeholder", input_placeholder_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32 && input_value_value !== (input_value_value = /*inputNum*/ ctx[151].numberValue || "") && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty[0] & /*$showFilterOptions*/ 2097152 && input_disabled_value !== (input_disabled_value = !/*$showFilterOptions*/ ctx[21])) {
    				prop_dev(input, "disabled", input_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 32) {
    				set_style(div2, "display", /*filterSelection*/ ctx[148].isSelected ? "" : "none");
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
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(2779:20) {#if filterSelection.isSelected}",
    		ctx
    	});

    	return block;
    }

    // (2778:16) {#each filterSelection.filters["Input Number"] || [] as inputNum, inputNumIdx (filterSelection.filterSelectionName + inputNum.filName || {}
    function create_each_block_3(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = /*filterSelection*/ ctx[148].isSelected && create_if_block_6(ctx);

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

    			if (/*filterSelection*/ ctx[148].isSelected) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_6(ctx);
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
    		source: "(2778:16) {#each filterSelection.filters[\\\"Input Number\\\"] || [] as inputNum, inputNumIdx (filterSelection.filterSelectionName + inputNum.filName || {}",
    		ctx
    	});

    	return block;
    }

    // (2420:12) {#each $filterOptions?.filterSelection || [] as filterSelection, filSelIdx (filterSelection.filterSelectionName || {}
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
    	let each_value_5 = /*filterSelection*/ ctx[148].filters.Dropdown || [];
    	validate_each_argument(each_value_5);
    	const get_key = ctx => /*filterSelection*/ ctx[148].filterSelectionName + /*Dropdown*/ ctx[157].filName || {};
    	validate_each_keys(ctx, each_value_5, get_each_context_5, get_key);

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		let child_ctx = get_each_context_5(ctx, each_value_5, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_2[i] = create_each_block_5(key, child_ctx));
    	}

    	let each_value_4 = /*filterSelection*/ ctx[148].filters.Checkbox || [];
    	validate_each_argument(each_value_4);
    	const get_key_1 = ctx => /*filterSelection*/ ctx[148].filterSelectionName + /*Checkbox*/ ctx[154].filName || {};
    	validate_each_keys(ctx, each_value_4, get_each_context_4, get_key_1);

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		let child_ctx = get_each_context_4(ctx, each_value_4, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks_1[i] = create_each_block_4(key, child_ctx));
    	}

    	let each_value_3 = /*filterSelection*/ ctx[148].filters["Input Number"] || [];
    	validate_each_argument(each_value_3);
    	const get_key_2 = ctx => /*filterSelection*/ ctx[148].filterSelectionName + /*inputNum*/ ctx[151].filName || {};
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

    			if (dirty[0] & /*$filterOptions, Init, maxFilterSelectionHeight, tagCategoryInfo, $showFilterOptions, windowWidth*/ 2101024 | dirty[1] & /*getTagFilterInfoText, handleFilterSelectOptionChange, getTagInfoHTML, getTagCategoryInfoHTML, closeFilterSelect, filterSelect*/ 14680120) {
    				each_value_5 = /*filterSelection*/ ctx[148].filters.Dropdown || [];
    				validate_each_argument(each_value_5);
    				validate_each_keys(ctx, each_value_5, get_each_context_5, get_key);
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key, 1, ctx, each_value_5, each0_lookup, t0.parentNode, destroy_block, create_each_block_5, t0, get_each_context_5);
    			}

    			if (dirty[0] & /*$filterOptions, $showFilterOptions, $activeTagFilters, $selectedCustomFilter*/ 2097376 | dirty[1] & /*handleCheckboxChange, pleaseWaitAlert*/ 16777280) {
    				each_value_4 = /*filterSelection*/ ctx[148].filters.Checkbox || [];
    				validate_each_argument(each_value_4);
    				validate_each_keys(ctx, each_value_4, get_each_context_4, get_key_1);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_1, 1, ctx, each_value_4, each1_lookup, t1.parentNode, destroy_block, create_each_block_4, t1, get_each_context_4);
    			}

    			if (dirty[0] & /*$filterOptions, $showFilterOptions, conditionalInputNumberList*/ 1075839008 | dirty[1] & /*handleInputNumber*/ 128) {
    				each_value_3 = /*filterSelection*/ ctx[148].filters["Input Number"] || [];
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
    		source: "(2420:12) {#each $filterOptions?.filterSelection || [] as filterSelection, filSelIdx (filterSelection.filterSelectionName || {}",
    		ctx
    	});

    	return block;
    }

    // (2910:24) {:else}
    function create_else_block_2(ctx) {
    	let h3;
    	let t_value = (/*activeTagFiltersArray*/ ctx[145]?.optionName || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "svelte-the3s7");
    			add_location(h3, file$2, 2910, 28, 130555);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeTagFiltersArrays*/ 8192 && t_value !== (t_value = (/*activeTagFiltersArray*/ ctx[145]?.optionName || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(2910:24) {:else}",
    		ctx
    	});

    	return block;
    }

    // (2904:68) 
    function create_if_block_4(ctx) {
    	let h3;
    	let t_value = (/*activeTagFiltersArray*/ ctx[145]?.optionType + " : " + /*activeTagFiltersArray*/ ctx[145]?.optionName || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "svelte-the3s7");
    			add_location(h3, file$2, 2904, 28, 130260);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeTagFiltersArrays*/ 8192 && t_value !== (t_value = (/*activeTagFiltersArray*/ ctx[145]?.optionType + " : " + /*activeTagFiltersArray*/ ctx[145]?.optionName || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(2904:68) ",
    		ctx
    	});

    	return block;
    }

    // (2898:24) {#if activeTagFiltersArray?.filterType === "input number"}
    function create_if_block_3(ctx) {
    	let h3;
    	let t_value = (/*activeTagFiltersArray*/ ctx[145]?.optionName + " : " + /*activeTagFiltersArray*/ ctx[145]?.optionValue || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "svelte-the3s7");
    			add_location(h3, file$2, 2898, 28, 129927);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeTagFiltersArrays*/ 8192 && t_value !== (t_value = (/*activeTagFiltersArray*/ ctx[145]?.optionName + " : " + /*activeTagFiltersArray*/ ctx[145]?.optionValue || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(2898:24) {#if activeTagFiltersArray?.filterType === \\\"input number\\\"}",
    		ctx
    	});

    	return block;
    }

    // (2862:12) {#each activeTagFiltersArrays || [] as activeTagFiltersArray (activeTagFiltersArray?.optionName + activeTagFiltersArray?.optionIdx + (activeTagFiltersArray?.optionType ?? "") || {}
    function create_each_block_1(key_1, ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let svg;
    	let path;
    	let svg_tabindex_value;
    	let t1;
    	let div1_tabindex_value;
    	let div1_outro;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type_4(ctx, dirty) {
    		if (/*activeTagFiltersArray*/ ctx[145]?.filterType === "input number") return create_if_block_3;
    		if (/*activeTagFiltersArray*/ ctx[145]?.optionType) return create_if_block_4;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_4(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler_9(...args) {
    		return /*click_handler_9*/ ctx[99](/*activeTagFiltersArray*/ ctx[145], ...args);
    	}

    	function keydown_handler_18(...args) {
    		return /*keydown_handler_18*/ ctx[100](/*activeTagFiltersArray*/ ctx[145], ...args);
    	}

    	function click_handler_10(...args) {
    		return /*click_handler_10*/ ctx[101](/*activeTagFiltersArray*/ ctx[145], ...args);
    	}

    	function keydown_handler_19(...args) {
    		return /*keydown_handler_19*/ ctx[102](/*activeTagFiltersArray*/ ctx[145], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			if_block.c();
    			t0 = space();
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t1 = space();
    			attr_dev(div0, "class", "activeFilter svelte-the3s7");
    			add_location(div0, file$2, 2896, 20, 129787);
    			attr_dev(path, "d", "M343 151a32 32 0 0 0-46-46L192 211 87 105a32 32 0 0 0-46 46l106 105L41 361a32 32 0 0 0 46 46l105-106 105 106a32 32 0 0 0 46-46L237 256l106-105z");
    			attr_dev(path, "class", "svelte-the3s7");
    			add_location(path, file$2, 2938, 24, 131992);
    			attr_dev(svg, "class", "removeActiveTag svelte-the3s7");
    			attr_dev(svg, "viewBox", "0 0 400 512");
    			attr_dev(svg, "tabindex", svg_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1");
    			add_location(svg, file$2, 2914, 20, 130722);
    			attr_dev(div1, "class", "activeTagFilter svelte-the3s7");
    			attr_dev(div1, "tabindex", div1_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1");

    			set_style(div1, "--activeTagFilterColor", /*activeTagFiltersArray*/ ctx[145]?.selected === "included"
    			? "hsl(185deg, 65%, 50%)"
    			: /*activeTagFiltersArray*/ ctx[145]?.selected === "excluded"
    				? "hsl(345deg, 75%, 60%)"
    				: "hsl(0deg, 0%, 50%)");

    			add_location(div1, file$2, 2862, 16, 128009);
    			this.first = div1;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			if_block.m(div0, null);
    			append_dev(div1, t0);
    			append_dev(div1, svg);
    			append_dev(svg, path);
    			append_dev(div1, t1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "click", prevent_default(click_handler_9), false, true, false, false),
    					listen_dev(svg, "keydown", keydown_handler_18, false, false, false, false),
    					listen_dev(div1, "click", click_handler_10, false, false, false, false),
    					listen_dev(div1, "keydown", keydown_handler_19, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type_4(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (!current || dirty[0] & /*$showFilterOptions*/ 2097152 && svg_tabindex_value !== (svg_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1")) {
    				attr_dev(svg, "tabindex", svg_tabindex_value);
    			}

    			if (!current || dirty[0] & /*$showFilterOptions*/ 2097152 && div1_tabindex_value !== (div1_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1")) {
    				attr_dev(div1, "tabindex", div1_tabindex_value);
    			}

    			if (dirty[0] & /*activeTagFiltersArrays*/ 8192) {
    				set_style(div1, "--activeTagFilterColor", /*activeTagFiltersArray*/ ctx[145]?.selected === "included"
    				? "hsl(185deg, 65%, 50%)"
    				: /*activeTagFiltersArray*/ ctx[145]?.selected === "excluded"
    					? "hsl(345deg, 75%, 60%)"
    					: "hsl(0deg, 0%, 50%)");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (div1_outro) div1_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			div1_outro = create_out_transition(div1, fade, { duration: 200 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block.d();
    			if (detaching && div1_outro) div1_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(2862:12) {#each activeTagFiltersArrays || [] as activeTagFiltersArray (activeTagFiltersArray?.optionName + activeTagFiltersArray?.optionIdx + (activeTagFiltersArray?.optionType ?? \\\"\\\") || {}",
    		ctx
    	});

    	return block;
    }

    // (2962:16) {:else}
    function create_else_block_1(ctx) {
    	let t_value = (/*$extraInfo*/ ctx[28] || "Browse an anime to watch") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$extraInfo*/ 268435456 && t_value !== (t_value = (/*$extraInfo*/ ctx[28] || "Browse an anime to watch") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(2962:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (2960:16) {#if $dataStatus && $showStatus}
    function create_if_block_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*$dataStatus*/ ctx[22]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$dataStatus*/ 4194304) set_data_dev(t, /*$dataStatus*/ ctx[22]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(2960:16) {#if $dataStatus && $showStatus}",
    		ctx
    	});

    	return block;
    }

    // (3086:8) {:else}
    function create_else_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "sortFilter skeleton shimmer svelte-the3s7");
    			add_location(div, file$2, 3086, 12, 139056);
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
    		id: create_else_block.name,
    		type: "else",
    		source: "(3086:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (3001:8) {#if $filterOptions?.sortFilter}
    function create_if_block$2(ctx) {
    	let div5;
    	let svg;
    	let path;
    	let path_d_value;
    	let svg_viewBox_value;
    	let svg_tabindex_value;
    	let t0;
    	let h20;
    	let t1_value = (/*selectedSortName*/ ctx[14] || "") + "";
    	let t1;
    	let h20_tabindex_value;
    	let t2;
    	let div4;
    	let div3;
    	let div1;
    	let h21;
    	let t4;
    	let div0;
    	let t5;
    	let div0_tabindex_value;
    	let t6;
    	let div2;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let div3_class_value;
    	let div4_class_value;
    	let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[10]}px`;
    	let mounted;
    	let dispose;
    	let each_value = /*$filterOptions*/ ctx[5]?.sortFilter?.[/*$selectedCustomFilter*/ ctx[6]] || /*sortFilterContents*/ ctx[31];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*sortFilter*/ ctx[142]?.sortName || {};
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			h20 = element("h2");
    			t1 = text(t1_value);
    			t2 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Sort By";
    			t4 = space();
    			div0 = element("div");
    			t5 = text("×");
    			t6 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(path, "d", path_d_value = // sortdown
    			/*selectedSortType*/ ctx[15] === "asc"
    			? "M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z"
    			: // sort up
    				"M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z");

    			attr_dev(path, "class", "svelte-the3s7");
    			add_location(path, file$2, 3010, 20, 134943);
    			attr_dev(svg, "viewBox", svg_viewBox_value = `0 ${/*selectedSortType*/ ctx[15] === "asc" ? "-" : ""}140 320 512`);
    			attr_dev(svg, "tabindex", svg_tabindex_value = /*selectedSortElement*/ ctx[3] ? "" : "0");
    			attr_dev(svg, "class", "svelte-the3s7");
    			add_location(svg, file$2, 3002, 16, 134573);
    			attr_dev(h20, "tabindex", h20_tabindex_value = /*selectedSortElement*/ ctx[3] ? "" : "0");
    			attr_dev(h20, "class", "svelte-the3s7");
    			add_location(h20, file$2, 3018, 16, 135397);
    			attr_dev(h21, "class", "svelte-the3s7");
    			add_location(h21, file$2, 3036, 28, 136224);
    			attr_dev(div0, "class", "closing-x svelte-the3s7");

    			attr_dev(div0, "tabindex", div0_tabindex_value = /*selectedSortElement*/ ctx[3] && /*windowWidth*/ ctx[9] <= 425
    			? "0"
    			: "");

    			add_location(div0, file$2, 3038, 28, 136354);
    			attr_dev(div1, "class", "header svelte-the3s7");
    			add_location(div1, file$2, 3035, 24, 136174);
    			attr_dev(div2, "class", "options svelte-the3s7");
    			add_location(div2, file$2, 3052, 24, 137012);
    			attr_dev(div3, "class", div3_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedSortElement*/ ctx[3] ? "" : "hide")) + " svelte-the3s7"));
    			add_location(div3, file$2, 3031, 20, 135993);

    			attr_dev(div4, "class", div4_class_value = "" + (null_to_empty("options-wrap " + (/*selectedSortElement*/ ctx[3]
    			? ""
    			: "disable-interaction hide")) + " svelte-the3s7"));

    			set_style(div4, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			add_location(div4, file$2, 3026, 16, 135735);
    			attr_dev(div5, "class", "sortFilter svelte-the3s7");
    			add_location(div5, file$2, 3001, 12, 134531);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, svg);
    			append_dev(svg, path);
    			append_dev(div5, t0);
    			append_dev(div5, h20);
    			append_dev(h20, t1);
    			append_dev(div5, t2);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, h21);
    			append_dev(div1, t4);
    			append_dev(div1, div0);
    			append_dev(div0, t5);
    			append_dev(div3, t6);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div2, null);
    				}
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "click", /*changeSortType*/ ctx[44], false, false, false, false),
    					listen_dev(svg, "keydown", /*keydown_handler_22*/ ctx[106], false, false, false, false),
    					listen_dev(h20, "click", /*handleSortFilterPopup*/ ctx[42], false, false, false, false),
    					listen_dev(h20, "keydown", /*keydown_handler_23*/ ctx[107], false, false, false, false),
    					listen_dev(div0, "keydown", /*keydown_handler_24*/ ctx[108], false, false, false, false),
    					listen_dev(div0, "click", /*handleSortFilterPopup*/ ctx[42], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedSortType*/ 32768 && path_d_value !== (path_d_value = // sortdown
    			/*selectedSortType*/ ctx[15] === "asc"
    			? "M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z"
    			: // sort up
    				"M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z")) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty[0] & /*selectedSortType*/ 32768 && svg_viewBox_value !== (svg_viewBox_value = `0 ${/*selectedSortType*/ ctx[15] === "asc" ? "-" : ""}140 320 512`)) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}

    			if (dirty[0] & /*selectedSortElement*/ 8 && svg_tabindex_value !== (svg_tabindex_value = /*selectedSortElement*/ ctx[3] ? "" : "0")) {
    				attr_dev(svg, "tabindex", svg_tabindex_value);
    			}

    			if (dirty[0] & /*selectedSortName*/ 16384 && t1_value !== (t1_value = (/*selectedSortName*/ ctx[14] || "") + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*selectedSortElement*/ 8 && h20_tabindex_value !== (h20_tabindex_value = /*selectedSortElement*/ ctx[3] ? "" : "0")) {
    				attr_dev(h20, "tabindex", h20_tabindex_value);
    			}

    			if (dirty[0] & /*selectedSortElement, windowWidth*/ 520 && div0_tabindex_value !== (div0_tabindex_value = /*selectedSortElement*/ ctx[3] && /*windowWidth*/ ctx[9] <= 425
    			? "0"
    			: "")) {
    				attr_dev(div0, "tabindex", div0_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions, $selectedCustomFilter, selectedSortType, selectedSortName*/ 49248 | dirty[1] & /*changeSort, sortFilterContents*/ 4097) {
    				each_value = /*$filterOptions*/ ctx[5]?.sortFilter?.[/*$selectedCustomFilter*/ ctx[6]] || /*sortFilterContents*/ ctx[31];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div2, destroy_block, create_each_block, null, get_each_context);
    			}

    			if (dirty[0] & /*selectedSortElement*/ 8 && div3_class_value !== (div3_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedSortElement*/ ctx[3] ? "" : "hide")) + " svelte-the3s7"))) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (dirty[0] & /*selectedSortElement*/ 8 && div4_class_value !== (div4_class_value = "" + (null_to_empty("options-wrap " + (/*selectedSortElement*/ ctx[3]
    			? ""
    			: "disable-interaction hide")) + " svelte-the3s7"))) {
    				attr_dev(div4, "class", div4_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 1024 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[10]}px`)) {
    				set_style(div4, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);

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
    		source: "(3001:8) {#if $filterOptions?.sortFilter}",
    		ctx
    	});

    	return block;
    }

    // (3063:36) {#if selectedSortName === sortFilter?.sortName}
    function create_if_block_1$1(ctx) {
    	let svg;
    	let path;
    	let path_d_value;
    	let svg_viewBox_value;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");

    			attr_dev(path, "d", path_d_value = // sortdown
    			/*selectedSortType*/ ctx[15] === "asc"
    			? "M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z"
    			: // sort up
    				"M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z");

    			attr_dev(path, "class", "svelte-the3s7");
    			add_location(path, file$2, 3070, 44, 138197);
    			attr_dev(svg, "viewBox", svg_viewBox_value = `0 ${/*selectedSortType*/ ctx[15] === "asc" ? "-180" : "100"} 320 512`);
    			attr_dev(svg, "class", "svelte-the3s7");
    			add_location(svg, file$2, 3063, 40, 137788);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedSortType*/ 32768 && path_d_value !== (path_d_value = // sortdown
    			/*selectedSortType*/ ctx[15] === "asc"
    			? "M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z"
    			: // sort up
    				"M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z")) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty[0] & /*selectedSortType*/ 32768 && svg_viewBox_value !== (svg_viewBox_value = `0 ${/*selectedSortType*/ ctx[15] === "asc" ? "-180" : "100"} 320 512`)) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(3063:36) {#if selectedSortName === sortFilter?.sortName}",
    		ctx
    	});

    	return block;
    }

    // (3054:28) {#each $filterOptions?.sortFilter?.[$selectedCustomFilter] || sortFilterContents as sortFilter (sortFilter?.sortName || {}
    function create_each_block(key_1, ctx) {
    	let div;
    	let h3;
    	let t0_value = (/*sortFilter*/ ctx[142]?.sortName || "") + "";
    	let t0;
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;
    	let if_block = /*selectedSortName*/ ctx[14] === /*sortFilter*/ ctx[142]?.sortName && create_if_block_1$1(ctx);

    	function keydown_handler_25(...args) {
    		return /*keydown_handler_25*/ ctx[109](/*sortFilter*/ ctx[142], ...args);
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
    			attr_dev(h3, "class", "svelte-the3s7");
    			add_location(h3, file$2, 3061, 36, 137624);
    			attr_dev(div, "class", "option svelte-the3s7");
    			add_location(div, file$2, 3054, 32, 137221);
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
    							if (is_function(/*changeSort*/ ctx[43](/*sortFilter*/ ctx[142]?.sortName))) /*changeSort*/ ctx[43](/*sortFilter*/ ctx[142]?.sortName).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(div, "keydown", keydown_handler_25, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$filterOptions, $selectedCustomFilter*/ 96 && t0_value !== (t0_value = (/*sortFilter*/ ctx[142]?.sortName || "") + "")) set_data_dev(t0, t0_value);

    			if (/*selectedSortName*/ ctx[14] === /*sortFilter*/ ctx[142]?.sortName) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
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
    		source: "(3054:28) {#each $filterOptions?.sortFilter?.[$selectedCustomFilter] || sortFilterContents as sortFilter (sortFilter?.sortName || {}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let main;
    	let div1;
    	let label0;
    	let t1;
    	let input0;
    	let input0_disabled_value;
    	let t2;
    	let t3;
    	let t4;
    	let div0;
    	let svg0;
    	let path0;
    	let div1_tabindex_value;
    	let t5;
    	let div2;
    	let t6;
    	let t7;
    	let div2_class_value;
    	let t8;
    	let div3;
    	let div3_class_value;
    	let t9;
    	let div6;
    	let div5;
    	let div4;
    	let svg1;
    	let path1;
    	let div4_tabindex_value;
    	let t10;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let div6_class_value;
    	let t11;
    	let div7;
    	let span;
    	let h2;
    	let span_outro;
    	let t12;
    	let div8;
    	let label1;
    	let t14;
    	let input1;
    	let t15;
    	let div10;
    	let div9;
    	let svg2;
    	let path2;
    	let path2_d_value;
    	let svg2_viewBox_value;
    	let t16;
    	let t17;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = (!/*editCustomFilterName*/ ctx[16] || !/*$showFilterOptions*/ ctx[21]) && create_if_block_18(ctx);
    	let if_block1 = /*$showFilterOptions*/ ctx[21] && create_if_block_16(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[5] && !/*$loadingFilterOptions*/ ctx[20]) return create_if_block_14;
    		return create_else_block_6;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block2 = current_block_type(ctx);
    	let if_block3 = /*$showFilterOptions*/ ctx[21] && /*$customFilters*/ ctx[23]?.length > 1 && create_if_block_13(ctx);
    	let if_block4 = /*$showFilterOptions*/ ctx[21] && /*customFilterName*/ ctx[19] && /*$activeTagFilters*/ ctx[7] && !/*$activeTagFilters*/ ctx[7]?.[/*customFilterName*/ ctx[19]] && create_if_block_12(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[5] && !/*$loadingFilterOptions*/ ctx[20]) return create_if_block_5;
    		return create_else_block_5;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block5 = current_block_type_1(ctx);
    	let each_value_1 = /*activeTagFiltersArrays*/ ctx[13] || [];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*activeTagFiltersArray*/ ctx[145]?.optionName + /*activeTagFiltersArray*/ ctx[145]?.optionIdx + (/*activeTagFiltersArray*/ ctx[145]?.optionType ?? "") || {};
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	function select_block_type_5(ctx, dirty) {
    		if (/*$dataStatus*/ ctx[22] && /*$showStatus*/ ctx[27]) return create_if_block_2;
    		return create_else_block_1;
    	}

    	let current_block_type_2 = select_block_type_5(ctx);
    	let if_block6 = current_block_type_2(ctx);

    	function select_block_type_6(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[5]?.sortFilter) return create_if_block$2;
    		return create_else_block;
    	}

    	let current_block_type_3 = select_block_type_6(ctx);
    	let if_block7 = current_block_type_3(ctx);
    	const default_slot_template = /*#slots*/ ctx[63].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[62], null);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Search Title";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			div0 = element("div");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t5 = space();
    			div2 = element("div");
    			if_block2.c();
    			t6 = space();
    			if (if_block3) if_block3.c();
    			t7 = space();
    			if (if_block4) if_block4.c();
    			t8 = space();
    			div3 = element("div");
    			if_block5.c();
    			t9 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t10 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t11 = space();
    			div7 = element("div");
    			span = element("span");
    			h2 = element("h2");
    			if_block6.c();
    			t12 = space();
    			div8 = element("div");
    			label1 = element("label");
    			label1.textContent = "Search Title";
    			t14 = space();
    			input1 = element("input");
    			t15 = space();
    			div10 = element("div");
    			div9 = element("div");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t16 = space();
    			if_block7.c();
    			t17 = space();
    			if (default_slot) default_slot.c();
    			attr_dev(label0, "class", "disable-interaction svelte-the3s7");
    			attr_dev(label0, "for", "custom-filter-name");
    			add_location(label0, file$2, 2094, 8, 83970);
    			attr_dev(input0, "id", "custom-filter-name");
    			attr_dev(input0, "class", "custom-filter svelte-the3s7");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "autocomplete", "off");
    			attr_dev(input0, "placeholder", "Custom Filter");
    			input0.disabled = input0_disabled_value = !/*editCustomFilterName*/ ctx[16];
    			set_style(input0, "pointer-events", /*editCustomFilterName*/ ctx[16] ? "" : "none");
    			add_location(input0, file$2, 2097, 8, 84084);
    			attr_dev(path0, "d", "M0 416c0 18 14 32 32 32h55a80 80 0 0 0 146 0h247a32 32 0 1 0 0-64H233a80 80 0 0 0-146 0H32c-18 0-32 14-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1-64 0zm192-160a32 32 0 1 1 64 0 32 32 0 1 1-64 0zm32-80c-33 0-61 20-73 48H32a32 32 0 1 0 0 64h247a80 80 0 0 0 146 0h55a32 32 0 1 0 0-64h-55a80 80 0 0 0-73-48zm-160-48a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73-64a80 80 0 0 0-146 0H32a32 32 0 1 0 0 64h87a80 80 0 0 0 146 0h215a32 32 0 1 0 0-64H265z");
    			attr_dev(path0, "class", "svelte-the3s7");
    			add_location(path0, file$2, 2238, 16, 91492);
    			attr_dev(svg0, "class", "showFilterOptions svelte-the3s7");
    			attr_dev(svg0, "tabindex", "0");
    			attr_dev(svg0, "viewBox", "0 0 512 512");
    			add_location(svg0, file$2, 2229, 12, 91152);
    			attr_dev(div0, "class", "custom-filter-icon-wrap svelte-the3s7");
    			add_location(div0, file$2, 2227, 8, 91033);
    			attr_dev(div1, "id", "custom-filter-wrap");
    			attr_dev(div1, "class", "custom-filter-wrap svelte-the3s7");
    			attr_dev(div1, "tabindex", div1_tabindex_value = /*selectedCustomFilterElement*/ ctx[0] ? "" : "0");
    			set_style(div1, "--editcancel-icon", /*$showFilterOptions*/ ctx[21] ? "2.5em" : "");

    			set_style(div1, "--save-icon", /*$showFilterOptions*/ ctx[21] && /*editCustomFilterName*/ ctx[16] && /*$selectedCustomFilter*/ ctx[6] && /*customFilterName*/ ctx[19] && /*$activeTagFilters*/ ctx[7] && !/*$activeTagFilters*/ ctx[7]?.[/*customFilterName*/ ctx[19]]
    			? "2.5em"
    			: "");

    			add_location(div1, file$2, 2078, 4, 83365);

    			attr_dev(div2, "class", div2_class_value = "" + (null_to_empty("custom-filter-settings-wrap" + (/*$showFilterOptions*/ ctx[21]
    			? ""
    			: " disable-interaction")) + " svelte-the3s7"));

    			set_style(div2, "--add-icon-size", /*customFilterName*/ ctx[19] && /*$activeTagFilters*/ ctx[7] && !/*$activeTagFilters*/ ctx[7]?.[/*customFilterName*/ ctx[19]]
    			? "2.5em"
    			: "");

    			set_style(div2, "--remove-icon-size", /*$customFilters*/ ctx[23]?.length > 1 ? "2.5em" : "");
    			add_location(div2, file$2, 2244, 4, 92033);

    			attr_dev(div3, "class", div3_class_value = "" + (null_to_empty("filters" + (/*$showFilterOptions*/ ctx[21]
    			? ""
    			: " disable-interaction") + (/*$hasWheel*/ ctx[25] ? " hasWheel" : "") + (/*shouldScrollSnap*/ ctx[56] && /*$android*/ ctx[26]
    			? " android"
    			: "")) + " svelte-the3s7"));

    			attr_dev(div3, "id", "filters");

    			set_style(div3, "--maxPaddingHeight", /*selectedFilterElement*/ ctx[2]
    			? /*maxFilterSelectionHeight*/ ctx[10] + 65 + "px"
    			: "0");

    			add_location(div3, file$2, 2397, 4, 98993);
    			attr_dev(path1, "d", "M367 413 100 145a192 192 0 0 0 268 268zm45-46A192 192 0 0 0 145 99l269 268zM1 256a256 256 0 1 1 512 0 256 256 0 1 1-512 0z");
    			attr_dev(path1, "class", "svelte-the3s7");
    			add_location(path1, file$2, 2856, 20, 127570);
    			attr_dev(svg1, "viewBox", "0 0 512 512");
    			attr_dev(svg1, "class", "svelte-the3s7");
    			add_location(svg1, file$2, 2855, 16, 127521);
    			attr_dev(div4, "tabindex", div4_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1");
    			attr_dev(div4, "class", "empty-tagFilter svelte-the3s7");
    			attr_dev(div4, "title", "Remove Filters");
    			add_location(div4, file$2, 2847, 12, 127186);
    			attr_dev(div5, "id", "tagFilters");
    			attr_dev(div5, "class", "tagFilters svelte-the3s7");
    			add_location(div5, file$2, 2846, 8, 127132);
    			attr_dev(div6, "id", "activeFilters");

    			attr_dev(div6, "class", div6_class_value = "" + (null_to_empty("activeFilters" + (!/*$loadingFilterOptions*/ ctx[20] && /*$showFilterOptions*/ ctx[21] && !/*$initData*/ ctx[24]
    			? ""
    			: " disable-interaction")) + " svelte-the3s7"));

    			add_location(div6, file$2, 2839, 4, 126910);
    			attr_dev(h2, "class", "svelte-the3s7");
    			add_location(h2, file$2, 2948, 12, 132430);
    			attr_dev(span, "class", "data-status svelte-the3s7");
    			add_location(span, file$2, 2947, 8, 132361);
    			attr_dev(div7, "id", "home-status");
    			attr_dev(div7, "class", "home-status svelte-the3s7");
    			add_location(div7, file$2, 2946, 4, 132309);
    			attr_dev(label1, "class", "disable-interaction svelte-the3s7");
    			attr_dev(label1, "for", "input-search");
    			add_location(label1, file$2, 2968, 8, 133112);
    			attr_dev(input1, "id", "input-search");
    			attr_dev(input1, "class", "input-search svelte-the3s7");
    			attr_dev(input1, "type", "search");
    			attr_dev(input1, "enterkeyhint", "search");
    			attr_dev(input1, "autocomplete", "off");
    			attr_dev(input1, "placeholder", "Search");
    			add_location(input1, file$2, 2971, 8, 133220);
    			attr_dev(div8, "class", "input-search-wrap svelte-the3s7");
    			attr_dev(div8, "id", "input-search-wrap");
    			add_location(div8, file$2, 2967, 4, 133048);

    			attr_dev(path2, "d", path2_d_value = /*isFullViewed*/ ctx[18]
    			? // arrows-up-down
    				"M183 9a32 32 0 0 0-46 0l-96 96a32 32 0 0 0 46 46l41-42v294l-41-42a32 32 0 0 0-46 46l96 96c13 12 33 12 46 0l96-96a32 32 0 0 0-46-46l-41 42V109l41 42a32 32 0 0 0 46-46L183 9z"
    			: // arrows-left-right
    				"m407 375 96-96c12-13 12-33 0-46l-96-96a32 32 0 0 0-46 46l42 41H109l42-41a32 32 0 0 0-46-46L9 233a32 32 0 0 0 0 46l96 96a32 32 0 0 0 46-46l-42-41h294l-42 41a32 32 0 0 0 46 46z");

    			attr_dev(path2, "class", "svelte-the3s7");
    			add_location(path2, file$2, 2991, 16, 133877);
    			attr_dev(svg2, "viewBox", svg2_viewBox_value = `0 0 ${/*isFullViewed*/ ctx[18] ? "312" : "512"} 512`);
    			attr_dev(svg2, "class", "svelte-the3s7");
    			add_location(svg2, file$2, 2990, 12, 133802);
    			attr_dev(div9, "tabindex", "0");
    			attr_dev(div9, "class", "changeGridView svelte-the3s7");
    			add_location(div9, file$2, 2984, 8, 133601);
    			attr_dev(div10, "class", "last-filter-option svelte-the3s7");
    			add_location(div10, file$2, 2983, 4, 133559);
    			attr_dev(main, "id", "main-home");
    			attr_dev(main, "class", "svelte-the3s7");
    			set_style(main, "--filters-space", /*$showFilterOptions*/ ctx[21] ? "80px" : "");

    			set_style(main, "--active-tag-filter-space", !/*$loadingFilterOptions*/ ctx[20] && /*$showFilterOptions*/ ctx[21] && !/*$initData*/ ctx[24]
    			? "auto"
    			: "");

    			set_style(main, "--custom-filter-settings-space", /*$showFilterOptions*/ ctx[21] ? "30px" : "");
    			add_location(main, file$2, 2067, 0, 82992);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*customFilterName*/ ctx[19]);
    			append_dev(div1, t2);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t3);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t4);
    			append_dev(div1, div0);
    			append_dev(div0, svg0);
    			append_dev(svg0, path0);
    			append_dev(main, t5);
    			append_dev(main, div2);
    			if_block2.m(div2, null);
    			append_dev(div2, t6);
    			if (if_block3) if_block3.m(div2, null);
    			append_dev(div2, t7);
    			if (if_block4) if_block4.m(div2, null);
    			append_dev(main, t8);
    			append_dev(main, div3);
    			if_block5.m(div3, null);
    			append_dev(main, t9);
    			append_dev(main, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, svg1);
    			append_dev(svg1, path1);
    			append_dev(div5, t10);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div5, null);
    				}
    			}

    			append_dev(main, t11);
    			append_dev(main, div7);
    			append_dev(div7, span);
    			append_dev(span, h2);
    			if_block6.m(h2, null);
    			append_dev(main, t12);
    			append_dev(main, div8);
    			append_dev(div8, label1);
    			append_dev(div8, t14);
    			append_dev(div8, input1);
    			set_input_value(input1, /*$searchedAnimeKeyword*/ ctx[29]);
    			append_dev(main, t15);
    			append_dev(main, div10);
    			append_dev(div10, div9);
    			append_dev(div9, svg2);
    			append_dev(svg2, path2);
    			append_dev(div10, t16);
    			if_block7.m(div10, null);
    			append_dev(main, t17);

    			if (default_slot) {
    				default_slot.m(main, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[65]),
    					listen_dev(svg0, "click", /*handleShowFilterOptions*/ ctx[46], false, false, false, false),
    					listen_dev(svg0, "keydown", /*keydown_handler_4*/ ctx[73], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_5*/ ctx[74], false, false, false, false),
    					listen_dev(div1, "click", /*handleCustomFilterPopup*/ ctx[47], false, false, false, false),
    					listen_dev(div3, "wheel", /*wheel_handler_2*/ ctx[97], false, false, false, false),
    					listen_dev(div4, "click", /*removeAllActiveTag*/ ctx[41], false, false, false, false),
    					listen_dev(div4, "keydown", /*keydown_handler_17*/ ctx[98], false, false, false, false),
    					listen_dev(h2, "click", /*click_handler_11*/ ctx[103], false, false, false, false),
    					listen_dev(h2, "keydown", keydown_handler_20, false, false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[104]),
    					listen_dev(div9, "click", /*handleGridView*/ ctx[45], false, false, false, false),
    					listen_dev(div9, "keydown", /*keydown_handler_21*/ ctx[105], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*editCustomFilterName*/ 65536 && input0_disabled_value !== (input0_disabled_value = !/*editCustomFilterName*/ ctx[16])) {
    				prop_dev(input0, "disabled", input0_disabled_value);
    			}

    			if (dirty[0] & /*customFilterName*/ 524288 && input0.value !== /*customFilterName*/ ctx[19]) {
    				set_input_value(input0, /*customFilterName*/ ctx[19]);
    			}

    			if (dirty[0] & /*editCustomFilterName*/ 65536) {
    				set_style(input0, "pointer-events", /*editCustomFilterName*/ ctx[16] ? "" : "none");
    			}

    			if (!/*editCustomFilterName*/ ctx[16] || !/*$showFilterOptions*/ ctx[21]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_18(ctx);
    					if_block0.c();
    					if_block0.m(div1, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*$showFilterOptions*/ ctx[21]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_16(ctx);
    					if_block1.c();
    					if_block1.m(div1, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty[0] & /*selectedCustomFilterElement*/ 1 && div1_tabindex_value !== (div1_tabindex_value = /*selectedCustomFilterElement*/ ctx[0] ? "" : "0")) {
    				attr_dev(div1, "tabindex", div1_tabindex_value);
    			}

    			if (dirty[0] & /*$showFilterOptions*/ 2097152) {
    				set_style(div1, "--editcancel-icon", /*$showFilterOptions*/ ctx[21] ? "2.5em" : "");
    			}

    			if (dirty[0] & /*$showFilterOptions, editCustomFilterName, $selectedCustomFilter, customFilterName, $activeTagFilters*/ 2687168) {
    				set_style(div1, "--save-icon", /*$showFilterOptions*/ ctx[21] && /*editCustomFilterName*/ ctx[16] && /*$selectedCustomFilter*/ ctx[6] && /*customFilterName*/ ctx[19] && /*$activeTagFilters*/ ctx[7] && !/*$activeTagFilters*/ ctx[7]?.[/*customFilterName*/ ctx[19]]
    				? "2.5em"
    				: "");
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div2, t6);
    				}
    			}

    			if (/*$showFilterOptions*/ ctx[21] && /*$customFilters*/ ctx[23]?.length > 1) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_13(ctx);
    					if_block3.c();
    					if_block3.m(div2, t7);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*$showFilterOptions*/ ctx[21] && /*customFilterName*/ ctx[19] && /*$activeTagFilters*/ ctx[7] && !/*$activeTagFilters*/ ctx[7]?.[/*customFilterName*/ ctx[19]]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_12(ctx);
    					if_block4.c();
    					if_block4.m(div2, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (!current || dirty[0] & /*$showFilterOptions*/ 2097152 && div2_class_value !== (div2_class_value = "" + (null_to_empty("custom-filter-settings-wrap" + (/*$showFilterOptions*/ ctx[21]
    			? ""
    			: " disable-interaction")) + " svelte-the3s7"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			if (dirty[0] & /*customFilterName, $activeTagFilters*/ 524416) {
    				set_style(div2, "--add-icon-size", /*customFilterName*/ ctx[19] && /*$activeTagFilters*/ ctx[7] && !/*$activeTagFilters*/ ctx[7]?.[/*customFilterName*/ ctx[19]]
    				? "2.5em"
    				: "");
    			}

    			if (dirty[0] & /*$customFilters*/ 8388608) {
    				set_style(div2, "--remove-icon-size", /*$customFilters*/ ctx[23]?.length > 1 ? "2.5em" : "");
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block5) {
    				if_block5.p(ctx, dirty);
    			} else {
    				if_block5.d(1);
    				if_block5 = current_block_type_1(ctx);

    				if (if_block5) {
    					if_block5.c();
    					if_block5.m(div3, null);
    				}
    			}

    			if (!current || dirty[0] & /*$showFilterOptions, $hasWheel, $android*/ 102760448 && div3_class_value !== (div3_class_value = "" + (null_to_empty("filters" + (/*$showFilterOptions*/ ctx[21]
    			? ""
    			: " disable-interaction") + (/*$hasWheel*/ ctx[25] ? " hasWheel" : "") + (/*shouldScrollSnap*/ ctx[56] && /*$android*/ ctx[26]
    			? " android"
    			: "")) + " svelte-the3s7"))) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (dirty[0] & /*selectedFilterElement, maxFilterSelectionHeight*/ 1028) {
    				set_style(div3, "--maxPaddingHeight", /*selectedFilterElement*/ ctx[2]
    				? /*maxFilterSelectionHeight*/ ctx[10] + 65 + "px"
    				: "0");
    			}

    			if (!current || dirty[0] & /*$showFilterOptions*/ 2097152 && div4_tabindex_value !== (div4_tabindex_value = /*$showFilterOptions*/ ctx[21] ? "0" : "-1")) {
    				attr_dev(div4, "tabindex", div4_tabindex_value);
    			}

    			if (dirty[0] & /*$showFilterOptions, activeTagFiltersArrays*/ 2105344 | dirty[1] & /*changeActiveSelect, removeActiveTag*/ 768) {
    				each_value_1 = /*activeTagFiltersArrays*/ ctx[13] || [];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div5, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
    				check_outros();
    			}

    			if (!current || dirty[0] & /*$loadingFilterOptions, $showFilterOptions, $initData*/ 19922944 && div6_class_value !== (div6_class_value = "" + (null_to_empty("activeFilters" + (!/*$loadingFilterOptions*/ ctx[20] && /*$showFilterOptions*/ ctx[21] && !/*$initData*/ ctx[24]
    			? ""
    			: " disable-interaction")) + " svelte-the3s7"))) {
    				attr_dev(div6, "class", div6_class_value);
    			}

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_5(ctx)) && if_block6) {
    				if_block6.p(ctx, dirty);
    			} else {
    				if_block6.d(1);
    				if_block6 = current_block_type_2(ctx);

    				if (if_block6) {
    					if_block6.c();
    					if_block6.m(h2, null);
    				}
    			}

    			if (dirty[0] & /*$searchedAnimeKeyword*/ 536870912 && input1.value !== /*$searchedAnimeKeyword*/ ctx[29]) {
    				set_input_value(input1, /*$searchedAnimeKeyword*/ ctx[29]);
    			}

    			if (!current || dirty[0] & /*isFullViewed*/ 262144 && path2_d_value !== (path2_d_value = /*isFullViewed*/ ctx[18]
    			? // arrows-up-down
    				"M183 9a32 32 0 0 0-46 0l-96 96a32 32 0 0 0 46 46l41-42v294l-41-42a32 32 0 0 0-46 46l96 96c13 12 33 12 46 0l96-96a32 32 0 0 0-46-46l-41 42V109l41 42a32 32 0 0 0 46-46L183 9z"
    			: // arrows-left-right
    				"m407 375 96-96c12-13 12-33 0-46l-96-96a32 32 0 0 0-46 46l42 41H109l42-41a32 32 0 0 0-46-46L9 233a32 32 0 0 0 0 46l96 96a32 32 0 0 0 46-46l-42-41h294l-42 41a32 32 0 0 0 46 46z")) {
    				attr_dev(path2, "d", path2_d_value);
    			}

    			if (!current || dirty[0] & /*isFullViewed*/ 262144 && svg2_viewBox_value !== (svg2_viewBox_value = `0 0 ${/*isFullViewed*/ ctx[18] ? "312" : "512"} 512`)) {
    				attr_dev(svg2, "viewBox", svg2_viewBox_value);
    			}

    			if (current_block_type_3 === (current_block_type_3 = select_block_type_6(ctx)) && if_block7) {
    				if_block7.p(ctx, dirty);
    			} else {
    				if_block7.d(1);
    				if_block7 = current_block_type_3(ctx);

    				if (if_block7) {
    					if_block7.c();
    					if_block7.m(div10, null);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[2] & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[62],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[62])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[62], dirty, null),
    						null
    					);
    				}
    			}

    			if (dirty[0] & /*$showFilterOptions*/ 2097152) {
    				set_style(main, "--filters-space", /*$showFilterOptions*/ ctx[21] ? "80px" : "");
    			}

    			if (dirty[0] & /*$loadingFilterOptions, $showFilterOptions, $initData*/ 19922944) {
    				set_style(main, "--active-tag-filter-space", !/*$loadingFilterOptions*/ ctx[20] && /*$showFilterOptions*/ ctx[21] && !/*$initData*/ ctx[24]
    				? "auto"
    				: "");
    			}

    			if (dirty[0] & /*$showFilterOptions*/ 2097152) {
    				set_style(main, "--custom-filter-settings-space", /*$showFilterOptions*/ ctx[21] ? "30px" : "");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			if (span_outro) span_outro.end(1);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			span_outro = create_out_transition(span, fade, { duration: 200 });
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if_block5.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if_block6.d();
    			if (detaching && span_outro) span_outro.end();
    			if_block7.d();
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

    function arraysAreEqual(arr1, arr2) {
    	if (arr1.length !== arr2.length) return false;
    	let sortedArr1 = arr1.map(obj => JSON.stringify(obj)).sort();
    	let sortedArr2 = arr2.map(obj => JSON.stringify(obj)).sort();

    	for (let i = 0; i < sortedArr1.length; i++) {
    		if (sortedArr1[i] !== sortedArr2[i]) return false;
    	}

    	return true;
    }

    function cleanText(k) {
    	k = k !== "_" ? k?.replace?.(/\_/g, " ") : k;
    	k = k !== '\\"' ? k?.replace?.(/\\"/g, '"') : k;
    	k = k?.replace?.(/\b(tv|ona|ova)\b/gi, match => match?.toUpperCase?.());
    	return k?.toLowerCase?.() || "";
    }

    function horizontalWheel(event, parentClass) {
    	let element = event.target;
    	let classList = element.classList;

    	if (!classList.contains(parentClass)) {
    		element = element.closest("." + parentClass);
    	}

    	if (element.scrollWidth <= element.clientWidth) return;

    	if (event.deltaY !== 0 && event.deltaX === 0) {
    		event.preventDefault();
    		event.stopPropagation();
    		element.scrollLeft = Math.max(0, element.scrollLeft + event.deltaY);
    	}
    }

    const wheel_handler = () => {
    	
    };

    const wheel_handler_1 = () => {
    	
    };

    const keydown_handler_20 = () => {
    	
    };

    function instance$2($$self, $$props, $$invalidate) {
    	let customFilterName;
    	let isFullViewed;
    	let $gridFullView;
    	let $confirmPromise;
    	let $filterOptions;
    	let $dropdownIsVisible;
    	let $selectedCustomFilter;
    	let $activeTagFilters;
    	let $loadingFilterOptions;
    	let $popupVisible;
    	let $showFilterOptions;
    	let $animeLoaderWorker;
    	let $finalAnimeList;
    	let $checkAnimeLoaderStatus;
    	let $dataStatus;
    	let $hiddenEntries;
    	let $newFinalAnime;
    	let $isImporting;
    	let $customFilters;
    	let $initData;
    	let $hasWheel;
    	let $android;
    	let $showStatus;
    	let $extraInfo;
    	let $searchedAnimeKeyword;
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(61, $gridFullView = $$value));
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(119, $confirmPromise = $$value));
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(5, $filterOptions = $$value));
    	validate_store(dropdownIsVisible, 'dropdownIsVisible');
    	component_subscribe($$self, dropdownIsVisible, $$value => $$invalidate(120, $dropdownIsVisible = $$value));
    	validate_store(selectedCustomFilter, 'selectedCustomFilter');
    	component_subscribe($$self, selectedCustomFilter, $$value => $$invalidate(6, $selectedCustomFilter = $$value));
    	validate_store(activeTagFilters, 'activeTagFilters');
    	component_subscribe($$self, activeTagFilters, $$value => $$invalidate(7, $activeTagFilters = $$value));
    	validate_store(loadingFilterOptions, 'loadingFilterOptions');
    	component_subscribe($$self, loadingFilterOptions, $$value => $$invalidate(20, $loadingFilterOptions = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(121, $popupVisible = $$value));
    	validate_store(showFilterOptions, 'showFilterOptions');
    	component_subscribe($$self, showFilterOptions, $$value => $$invalidate(21, $showFilterOptions = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(122, $animeLoaderWorker = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(123, $finalAnimeList = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(124, $checkAnimeLoaderStatus = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(22, $dataStatus = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(125, $hiddenEntries = $$value));
    	validate_store(newFinalAnime, 'newFinalAnime');
    	component_subscribe($$self, newFinalAnime, $$value => $$invalidate(126, $newFinalAnime = $$value));
    	validate_store(isImporting, 'isImporting');
    	component_subscribe($$self, isImporting, $$value => $$invalidate(127, $isImporting = $$value));
    	validate_store(customFilters, 'customFilters');
    	component_subscribe($$self, customFilters, $$value => $$invalidate(23, $customFilters = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(24, $initData = $$value));
    	validate_store(hasWheel, 'hasWheel');
    	component_subscribe($$self, hasWheel, $$value => $$invalidate(25, $hasWheel = $$value));
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(26, $android = $$value));
    	validate_store(showStatus, 'showStatus');
    	component_subscribe($$self, showStatus, $$value => $$invalidate(27, $showStatus = $$value));
    	validate_store(extraInfo, 'extraInfo');
    	component_subscribe($$self, extraInfo, $$value => $$invalidate(28, $extraInfo = $$value));
    	validate_store(searchedAnimeKeyword, 'searchedAnimeKeyword');
    	component_subscribe($$self, searchedAnimeKeyword, $$value => $$invalidate(29, $searchedAnimeKeyword = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Search', slots, ['default']);
    	let Init = true;
    	let windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth);
    	let windowHeight = Math.max(window.visualViewport.height, window.innerHeight);
    	let maxFilterSelectionHeight = windowHeight * 0.3;
    	let animeGridEl;
    	let popupContainer;
    	let selectedCustomFilterElement;
    	let selectedFilterTypeElement;
    	let selectedFilterElement;
    	let selectedSortElement;
    	let highlightedEl;
    	let filterScrollTimeout;
    	let filterIsScrolling;
    	let tagCategoryInfo = {};
    	let nameChangeUpdateProcessedList = ["Algorithm Filter"];
    	let nameChangeUpdateFinalList = ["sort", "Anime Filter", "Content Caution"];
    	let conditionalInputNumberList = ["weighted score", "score", "average score", "user score", "popularity", "year"];
    	let isUpdatingRec = false, isLoadingAnime = false;

    	let scrollingToTop,
    		activeTagFiltersArrays,
    		selectedFilterSelectionIdx,
    		selectedFilterSelectionName,
    		selectedSortIdx,
    		selectedSort,
    		selectedSortName,
    		selectedSortType;

    	let sortFilterContents = [
    		{
    			sortName: "weighted score",
    			sortType: "desc"
    		},
    		{ sortName: "date", sortType: "none" },
    		{ sortName: "user score", sortType: "none" },
    		{
    			sortName: "average score",
    			sortType: "none"
    		},
    		{ sortName: "score", sortType: "none" },
    		{ sortName: "popularity", sortType: "none" },
    		{ sortName: "trending", sortType: "none" },
    		{ sortName: "favorites", sortType: "none" },
    		{ sortName: "date added", sortType: "none" }
    	];

    	activeTagFilters.subscribe(val => {
    		set_store_value(customFilters, $customFilters = Object.keys(val || {}).sort(), $customFilters);
    	});

    	async function saveFilters(changeName) {
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();

    		if (nameChangeUpdateProcessedList.includes(changeName)) {
    			isUpdatingRec = true;
    			set_store_value(dataStatus, $dataStatus = "Updating List", $dataStatus);
    			_processRecommendedAnimeList();
    		} else if (nameChangeUpdateFinalList.includes(changeName)) {
    			isLoadingAnime = true;
    			set_store_value(dataStatus, $dataStatus = "Updating List", $dataStatus);
    			_loadAnime(true);
    		} else if (!isLoadingAnime && !isUpdatingRec && !$isImporting) {
    			await saveJSON($filterOptions, "filterOptions");
    			await saveJSON($activeTagFilters, "activeTagFilters");
    		}
    	}

    	async function _loadAnime(hasPassedFilters = true, loadNewList = true) {
    		$animeLoaderWorker?.terminate?.();
    		set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);

    		animeLoader$1({
    			filterOptions: $filterOptions,
    			activeTagFilters: $activeTagFilters,
    			selectedCustomFilter: $selectedCustomFilter,
    			hasPassedFilters
    		}).then(async data => {
    			isUpdatingRec = isLoadingAnime = false;
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);

    			if (data.isNew) {
    				if ($finalAnimeList instanceof Array) {
    					set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    				}

    				data?.finalAnimeList?.forEach?.((anime, idx) => {
    					set_store_value(
    						newFinalAnime,
    						$newFinalAnime = {
    							id: anime.id,
    							idx: data.shownAnimeListCount + idx,
    							finalAnimeList: anime
    						},
    						$newFinalAnime
    					);
    				});

    				set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries || $hiddenEntries, $hiddenEntries);
    			}

    			set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    			return;
    		}).catch(error => {
    			console.error(error);
    		});
    	}

    	async function _processRecommendedAnimeList() {
    		await saveJSON(true, "shouldProcessRecommendation");

    		processRecommendedAnimeList({
    			filterOptions: $filterOptions,
    			activeTagFilters: $activeTagFilters,
    			selectedCustomFilter: $selectedCustomFilter
    		}).then(async () => {
    			updateFilters.update(e => !e);
    			_loadAnime(true, false);
    		}).catch(error => {
    			_loadAnime(true);
    			console.error(error);
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
    		windowHeight = Math.max(window.visualViewport.height, window.innerHeight);
    		$$invalidate(10, maxFilterSelectionHeight = windowHeight * 0.3);
    		$$invalidate(9, windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth));
    	}

    	async function handleFilterTypes(event, newFilterTypeName) {
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		event?.stopPropagation?.();
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected]?.filterSelectionName;

    		if (nameTypeSelected !== newFilterTypeName && isJsonObject($filterOptions?.filterSelection?.[idxTypeSelected])) {
    			// Close Filter Dropdown
    			$$invalidate(3, selectedSortElement = false);

    			// Reload Anime for Async Animation
    			if ($finalAnimeList?.length > 36 && !$gridFullView) {
    				await callAsyncAnimeReload();
    			}

    			// Close Filter Selection Dropdown
    			$filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.forEach?.(e => {
    				e.selected = false;
    			});

    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    			$$invalidate(2, selectedFilterElement = null);

    			// Change Filter Type
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].isSelected = false, $filterOptions);

    			let newIdxFilterTypeSelected = $filterOptions?.filterSelection?.findIndex?.(({ filterSelectionName }) => filterSelectionName === newFilterTypeName);

    			if (isJsonObject($filterOptions?.filterSelection?.[newIdxFilterTypeSelected])) {
    				set_store_value(filterOptions, $filterOptions.filterSelection[newIdxFilterTypeSelected].isSelected = true, $filterOptions);
    			}

    			scrollToFirstFilter();
    			scrollToFirstTagFilter();
    			saveFilters();
    		}

    		if (highlightedEl instanceof Element && highlightedEl.closest(".filterType")) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		$$invalidate(1, selectedFilterTypeElement = false);
    	}

    	function handleShowFilterTypes(event) {
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		let element = event.target;
    		let classList = element?.classList || [];
    		let filterTypEl = element?.closest?.(".filterType");
    		let optionsWrap = element?.closest?.(".options-wrap");

    		if ((classList.contains("filterType") || filterTypEl) && !selectedFilterTypeElement && !classList.contains("closing-x")) {
    			$$invalidate(1, selectedFilterTypeElement = true);
    		} else if ((!optionsWrap || classList.contains("closing-x")) && !classList.contains("options-wrap")) {
    			if (highlightedEl instanceof Element && highlightedEl.closest(".filterType")) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}

    			$$invalidate(1, selectedFilterTypeElement = false);
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
    		let filSelectEl = element?.closest?.(".filter-select");
    		if (filSelectEl === selectedFilterElement) return;
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		if (Init) $$invalidate(8, Init = false);

    		if (selectedFilterElement instanceof Element) {
    			let filterSelectChildrenArray = Array.from(selectedFilterElement?.parentElement?.children || []).filter(el => {
    				return !el?.classList?.contains?.("disable-interaction");
    			});

    			let selectedIndex = filterSelectChildrenArray?.indexOf?.(selectedFilterElement);

    			if (isJsonObject($filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.[selectedIndex])) {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[selectedIndex].selected = false, $filterOptions);
    			}
    		}

    		if (highlightedEl instanceof Element && highlightedEl.closest(".filter-select")) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		if (isJsonObject($filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx])) {
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].selected = true, $filterOptions);
    		}

    		$$invalidate(2, selectedFilterElement = filSelectEl);
    	}

    	function closeFilterSelect(dropDownIdx) {
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		if (!isJsonObject($filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.[dropDownIdx])) return;
    		set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropDownIdx].selected = false, $filterOptions);

    		if (highlightedEl instanceof Element && highlightedEl.closest(".filter-select")) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		$$invalidate(2, selectedFilterElement = null);
    	}

    	async function clickOutsideListener(event) {
    		if ($filterOptions?.filterSelection?.length < 1 || !$filterOptions) return;
    		let element = event?.target;
    		let classList = element?.classList || [];

    		if (classList.contains("options-wrap") && getComputedStyle(element).position === "fixed") {
    			// Small Screen Width
    			if (highlightedEl instanceof Element) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}

    			// CLose Custom Filter Dropdown
    			$$invalidate(0, selectedCustomFilterElement = false);

    			// Close Filter Type Dropdown
    			$$invalidate(1, selectedFilterTypeElement = false);

    			// Close Sort Filter Dropdown
    			$$invalidate(3, selectedSortElement = false);

    			// Close Filter Selection Dropdown
    			let idxTypeSelected = selectedFilterSelectionIdx;

    			$filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.forEach?.(e => {
    				e.selected = false;
    			});

    			if ($filterOptions?.filterSelection?.[idxTypeSelected]) {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    			}

    			$$invalidate(2, selectedFilterElement = null);
    		} else if (!classList.contains("options-wrap") && !element?.closest?.(".options-wrap") && !classList.contains("fullPopupWrapper") && !element?.closest?.(".fullPopupWrapper") && !classList.contains("item-info") && !classList.contains("extra-item-info") && !classList.contains("item-info-path") && !element?.closest?.(".item-info") && !element?.closest?.(".extra-item-info")) {
    			// Large Screen Width
    			// Custom Filter Dropdown
    			let customFilterEl = element?.closest?.(".custom-filter-wrap");

    			if (!classList.contains("custom-filter-wrap") && !customFilterEl) {
    				if (highlightedEl instanceof Element && highlightedEl.closest(".custom-filter-wrap")) {
    					removeClass(highlightedEl, "highlight");
    					highlightedEl = null;
    				}

    				$$invalidate(0, selectedCustomFilterElement = false);
    			}

    			// Filter Type Dropdown
    			let filterTypeEl = element?.closest(".filterType");

    			if (!classList.contains("filterType") && !filterTypeEl) {
    				if (highlightedEl instanceof Element && highlightedEl.closest(".filterType")) {
    					removeClass(highlightedEl, "highlight");
    					highlightedEl = null;
    				}

    				$$invalidate(1, selectedFilterTypeElement = false);
    			}

    			// Sort Filter Dropdown
    			let sortSelectEl = element?.closest(".sortFilter");

    			if (!classList.contains("sortFilter") && !sortSelectEl) {
    				if (highlightedEl instanceof Element && highlightedEl.closest(".sortFilter")) {
    					removeClass(highlightedEl, "highlight");
    					highlightedEl = null;
    				}

    				$$invalidate(3, selectedSortElement = false);
    			}

    			// Filter Selection Dropdown
    			let inputDropdownSelectEl = element?.closest(".select");

    			let inputDropdownAngleDown = element?.closest(".angle-down");

    			if (!classList.contains("select") && !classList.contains("angle-down") && !inputDropdownAngleDown && !inputDropdownSelectEl) {
    				if (highlightedEl instanceof Element && highlightedEl.closest(".filter-select")) {
    					removeClass(highlightedEl, "highlight");
    					highlightedEl = null;
    				}

    				let idxTypeSelected = selectedFilterSelectionIdx;

    				$filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.forEach?.(e => {
    					e.selected = false;
    				});

    				if ($filterOptions?.filterSelection?.[idxTypeSelected]) {
    					set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    				}

    				$$invalidate(2, selectedFilterElement = null);
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
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected]?.filterSelectionName;
    		let currentValue = $filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.[dropdownIdx]?.options?.[optionIdx]?.selected;

    		if ((currentValue === "none" || currentValue === true) && $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] instanceof Array) {
    			// true is default value of selections
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "included", $filterOptions);

    			let hasActiveFilter = false;

    			set_store_value(
    				activeTagFilters,
    				$activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected]?.map?.(e => {
    					if (e.optionName + e.optionIdx + e.optionType === optionName + optionIdx + optionType) {
    						hasActiveFilter = true;
    						e.selected = "included";
    					}

    					return e;
    				}),
    				$activeTagFilters
    			);

    			if (!hasActiveFilter) {
    				$activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected]?.unshift?.({
    					optionName,
    					optionType,
    					optionIdx,
    					categIdx: dropdownIdx,
    					selected: "included",
    					changeType,
    					filterType: "dropdown"
    				});

    				set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected], $activeTagFilters);
    			}
    		} else if (currentValue === "included" && changeType === "write" && isJsonObject($filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.[dropdownIdx]?.options?.[optionIdx]) && $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] instanceof Array) {
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "excluded", $filterOptions);

    			set_store_value(
    				activeTagFilters,
    				$activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].map(e => {
    					if (e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === "dropdown" && e.categIdx === dropdownIdx && e.selected === "included" && e.optionType === optionType) {
    						e.selected = "excluded";
    					}

    					return e;
    				}),
    				$activeTagFilters
    			);
    		} else if (isJsonObject($filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.[dropdownIdx]?.options?.[optionIdx]) && $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] instanceof Array) {
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "none", $filterOptions);
    			set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].filter(e => !(e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === "dropdown" && e.categIdx === dropdownIdx && e.optionType === optionType)), $activeTagFilters);
    		}

    		saveFilters(filterSelectionName);
    	}

    	function handleCheckboxChange(event, checkBoxName, checkboxIdx, filterSelectionName) {
    		let element = event.target;
    		let classList = element?.classList || [];
    		let keyCode = event.which || event.keyCode || 0;

    		if (classList.contains("checkbox") && event.type === "click" || classList.contains("checkbox") && keyCode !== 13 && event.type === "keydown" || filterIsScrolling && event.pointerType === "mouse") {
    			return;
    		}

    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) {
    			if (!classList.contains("checkbox")) {
    				pleaseWaitAlert();
    			}

    			return;
    		}

    		// Prevent Default
    		let idxTypeSelected = selectedFilterSelectionIdx;

    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected]?.filterSelectionName;
    		let isChecked = $filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Checkbox?.[checkboxIdx]?.isSelected;

    		if (isChecked && $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] instanceof Array) {
    			set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].filter(e => !(e.optionIdx === checkboxIdx && e.optionName === checkBoxName && e.filterType === "checkbox" && e.selected === "included")), $activeTagFilters);
    		} else if ($activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] instanceof Array) {
    			let hasActiveFilter = false;

    			set_store_value(
    				activeTagFilters,
    				$activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].map(e => {
    					if (e.optionName + e.optionIdx === checkBoxName + checkboxIdx) {
    						hasActiveFilter = true;
    						e.selected = "included";
    					}

    					return e;
    				}),
    				$activeTagFilters
    			);

    			if (!hasActiveFilter) {
    				$activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected]?.unshift?.({
    					optionName: checkBoxName,
    					optionIdx: checkboxIdx,
    					filterType: "checkbox",
    					selected: "included",
    					changeType: "read"
    				});

    				set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected], $activeTagFilters);
    			}
    		}

    		if (isJsonObject($filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Checkbox?.[checkboxIdx])) set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[checkboxIdx].isSelected = !$filterOptions?.filterSelection?.[idxTypeSelected].filters.Checkbox[checkboxIdx].isSelected, $filterOptions);
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
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected]?.filterSelectionName;
    		let currentValue = $filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.["Input Number"]?.[inputNumIdx]?.numberValue;

    		if (conditionalInputNumberList.includes(inputNumberName) && (/^(>=|<=|<|>).*($)/).test(newValue)) {
    			let newSplitValue = newValue?.split(/(<=|>=|<|>)/)?.filter?.(e => e); // Check if it starts or ends with comparison operators
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

    				if (newValue !== currentValue && (!isNaN(newCMPNumber) && (parseFloat(newCMPNumber) >= minValue || typeof minValue !== "number") && (parseFloat(newCMPNumber) <= maxValue || typeof maxValue !== "number") || !newCMPNumber) && isJsonObject($filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.["Input Number"]?.[inputNumIdx])) {
    					let shouldReload = false;

    					if (!newCMPNumber && $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] instanceof Array) {
    						shouldReload = true;
    						set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].filter(e => !(e.optionIdx === inputNumIdx && e.optionName === inputNumberName && e.filterType === "input number")), $activeTagFilters);
    					} else if ($activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] instanceof Array) {
    						let hasActiveFilter = false;

    						set_store_value(
    							activeTagFilters,
    							$activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].map(e => {
    								if (e.optionName + e.optionIdx === inputNumberName + inputNumIdx) {
    									shouldReload = e.selected !== "none";
    									hasActiveFilter = true;
    									e.optionValue = newValue;
    									e.CMPoperator = newCMPOperator;
    									e.CMPNumber = newCMPNumber;
    								}

    								return e;
    							}),
    							$activeTagFilters
    						);

    						if (!hasActiveFilter) {
    							shouldReload = true;

    							$activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].unshift({
    								optionName: inputNumberName,
    								optionValue: newValue,
    								CMPoperator: newCMPOperator,
    								CMPNumber: newCMPNumber,
    								optionIdx: inputNumIdx,
    								filterType: "input number",
    								selected: "included",
    								changeType: "read"
    							});

    							activeTagFilters.set($activeTagFilters);
    						}
    					}

    					set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters["Input Number"][inputNumIdx].numberValue = newValue, $filterOptions);

    					if (shouldReload) {
    						saveFilters(filterSelectionName);
    					}
    				} else {
    					changeInputValue(event.target, currentValue);
    				}
    			} else {
    				changeInputValue(event.target, currentValue);
    			}
    		} else if ($activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] instanceof Array && isJsonObject($filterOptions.filterSelection[idxTypeSelected].filters["Input Number"][inputNumIdx])) {
    			if (newValue !== currentValue && (!isNaN(newValue) && (parseFloat(newValue) >= minValue || typeof minValue !== "number") && (parseFloat(newValue) <= maxValue || typeof maxValue !== "number") || newValue === "")) {
    				let shouldReload = false;

    				if (newValue === "") {
    					shouldReload = true;
    					set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].filter(e => !(e.optionIdx === inputNumIdx && e.optionName === inputNumberName && e.optionValue === currentValue && e.filterType === "input number")), $activeTagFilters);
    				} else {
    					let hasActiveFilter = false;

    					set_store_value(
    						activeTagFilters,
    						$activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].map(e => {
    							if (e.optionName + e.optionIdx === inputNumberName + inputNumIdx) {
    								shouldReload = e.selected !== "none";
    								hasActiveFilter = true;
    								delete e.CMPoperator;
    								delete e.CMPNumber;
    								e.optionValue = newValue;
    							}

    							return e;
    						}),
    						$activeTagFilters
    					);

    					if (!hasActiveFilter) {
    						shouldReload = true;

    						$activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].unshift({
    							optionName: inputNumberName,
    							optionValue: newValue,
    							optionIdx: inputNumIdx,
    							filterType: "input number",
    							selected: "included",
    							changeType: "read"
    						});

    						activeTagFilters.set($activeTagFilters);
    					}
    				}

    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters["Input Number"][inputNumIdx].numberValue = newValue, $filterOptions);

    				if (shouldReload) {
    					saveFilters(filterSelectionName);
    				}
    			} else {
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
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		let element = event?.target;
    		let classList = element?.classList;
    		if (classList?.contains?.("removeActiveTag") || element?.closest?.(".removeActiveTag")) return;
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected]?.filterSelectionName;

    		if (filterType === "input number") {
    			let elementIdx = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected]?.findIndex?.(item => item.optionName === optionName && item.optionValue === optionValue && item.optionIdx === optionIdx && item.filterType === "input number");

    			if (elementIdx >= 0) {
    				let currentSelect = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected]?.[elementIdx]?.selected;
    				if (!isJsonObject($activeTagFilters[$selectedCustomFilter][nameTypeSelected][elementIdx])) return;

    				if (currentSelect === "included") {
    					set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected][elementIdx].selected = "none", $activeTagFilters);
    				} else if (currentSelect != null) {
    					set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected][elementIdx].selected = "included", $activeTagFilters);
    				}
    			}
    		} else if (filterType === "checkbox") {
    			let tagFilterIdx = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected]?.findIndex?.(e => e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === filterType);
    			if (!isJsonObject($activeTagFilters[$selectedCustomFilter][nameTypeSelected][tagFilterIdx])) return;
    			let checkboxSelection = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected]?.[tagFilterIdx]?.selected;

    			if (checkboxSelection === "included") {
    				set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected][tagFilterIdx].selected = "none", $activeTagFilters);
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[optionIdx].isSelected = false, $filterOptions);
    			} else if (checkboxSelection != null) {
    				set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected][tagFilterIdx].selected = "included", $activeTagFilters);
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[optionIdx].isSelected = true, $filterOptions);
    			}
    		} else if (filterType === "dropdown") {
    			let currentSelect = $filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.[categIdx]?.options?.[optionIdx]?.selected;

    			if (currentSelect === "included" && changeType === "write") {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected = "excluded", $filterOptions);

    				set_store_value(
    					activeTagFilters,
    					$activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].map(e => {
    						if (e.optionIdx === optionIdx && e.optionName === optionName && e.selected === "included" && (e.optionType ? e.optionType === optionType : true)) {
    							e.selected = "excluded";
    						}

    						return e;
    					}),
    					$activeTagFilters
    				);
    			} else if (currentSelect === "none") {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected = "included", $filterOptions);

    				set_store_value(
    					activeTagFilters,
    					$activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].map(e => {
    						if (e.optionIdx === optionIdx && e.optionName === optionName && e.selected === "none" && (e.optionType ? e.optionType === optionType : true)) {
    							e.selected = "included";
    						}

    						return e;
    					}),
    					$activeTagFilters
    				);
    			} else if (isJsonObject($filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx]) && $activeTagFilters[$selectedCustomFilter][nameTypeSelected] instanceof Array) {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected = "none", $filterOptions);

    				set_store_value(
    					activeTagFilters,
    					$activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].map(e => {
    						if (e.optionIdx === optionIdx && e.optionName === optionName && (e.optionType ? e.optionType === optionType : true)) {
    							e.selected = "none";
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
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected]?.filterSelectionName;
    		let toChangeIsJson = $filterOptions?.filterSelection?.[idxTypeSelected]?.filters;

    		if (filterType === "checkbox") {
    			// Is Checkbox
    			toChangeIsJson = isJsonObject(toChangeIsJson?.Checkbox?.[optionIdx]);
    		} else if (filterType === "input number") {
    			toChangeIsJson = isJsonObject(toChangeIsJson?.["Input Number"]?.[optionIdx]);
    		} else {
    			toChangeIsJson = isJsonObject(toChangeIsJson?.Dropdown?.[categIdx]?.options?.[optionIdx]);
    		}

    		if (!toChangeIsJson || !($activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] instanceof Array)) return;

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

    		set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected] = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected].filter(e => !(e.optionName === optionName && e.optionIdx === optionIdx && e.filterType === filterType && (e.optionType ? e.optionType === optionType : true))), $activeTagFilters);
    		saveFilters(nameTypeSelected);
    	}

    	async function removeAllActiveTag(event) {
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected]?.filterSelectionName;
    		let hasActiveFilter = $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected]?.length;

    		if (hasActiveFilter && $filterOptions?.filterSelection?.[idxTypeSelected] && $activeTagFilters?.[$selectedCustomFilter]?.[nameTypeSelected] && await $confirmPromise("Do you want to remove all filters?")) {
    			// Remove Active Number Input
    			$filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.["Input Number"]?.forEach?.(e => {
    				e.numberValue = "";
    			});

    			// Remove Checkbox
    			$filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Checkbox?.forEach?.(e => {
    				e.isSelected = false;
    			});

    			// Remove Dropdown
    			$filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.forEach?.(({ options }, dropdownIdx) => {
    				options?.forEach?.(({ selected }, optionsIdx) => {
    					selected = "none";

    					if (isJsonObject($filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionsIdx])) {
    						set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionsIdx].selected = selected, $filterOptions);
    					}
    				});
    			});

    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    			set_store_value(activeTagFilters, $activeTagFilters[$selectedCustomFilter][nameTypeSelected] = [], $activeTagFilters);
    			saveFilters(nameTypeSelected);
    		}
    	}

    	function handleSortFilterPopup(event) {
    		let element = event.target;
    		let classList = element.classList;
    		let sortSelectEl = element.closest(".sortFilter");
    		let optionsWrap = element.closest(".options-wrap");

    		if ((classList.contains("sortFilter") || sortSelectEl) && !selectedSortElement) {
    			$$invalidate(3, selectedSortElement = true);
    		} else if ((!optionsWrap || classList.contains("closing-x")) && !classList.contains("options-wrap")) {
    			if (highlightedEl instanceof Element && highlightedEl.closest(".sortFilter")) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}

    			$$invalidate(3, selectedSortElement = false);
    		}
    	}

    	function changeSort(newSortName) {
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		let idxSortSelected = selectedSortIdx;

    		let selectedSortFilter = $filterOptions?.sortFilter?.[$selectedCustomFilter]?.[idxSortSelected] || {
    			sortName: "weighted score",
    			sortType: "desc"
    		};

    		let sortName = selectedSortFilter?.sortName;
    		let sortType = selectedSortFilter?.sortType;

    		if (isJsonObject($filterOptions?.sortFilter?.[$selectedCustomFilter]?.[idxSortSelected])) {
    			if (sortName === newSortName) {
    				let newSortType = sortType === "desc" ? "asc" : "desc";
    				set_store_value(filterOptions, $filterOptions.sortFilter[$selectedCustomFilter][idxSortSelected].sortType = newSortType, $filterOptions);
    			} else if (sortName !== newSortName) {
    				set_store_value(filterOptions, $filterOptions.sortFilter[$selectedCustomFilter][idxSortSelected].sortType = "none", $filterOptions);
    				let idxNewSortSelected = $filterOptions?.sortFilter?.[$selectedCustomFilter]?.findIndex?.(({ sortName }) => sortName === newSortName);

    				if (isJsonObject($filterOptions.sortFilter[$selectedCustomFilter][idxNewSortSelected])) {
    					set_store_value(filterOptions, $filterOptions.sortFilter[$selectedCustomFilter][idxNewSortSelected].sortType = "desc", $filterOptions);
    				}
    			}
    		}

    		saveFilters("sort");

    		if (highlightedEl instanceof Element && highlightedEl.closest(".sortFilter")) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		$$invalidate(3, selectedSortElement = false);
    	}

    	function changeSortType() {
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		let idxSortSelected = selectedSortIdx;
    		let sortType = $filterOptions?.sortFilter?.[$selectedCustomFilter]?.[idxSortSelected]?.sortType || "desc";

    		if (isJsonObject($filterOptions?.sortFilter?.[$selectedCustomFilter]?.[idxSortSelected])) {
    			if (sortType === "desc") {
    				set_store_value(filterOptions, $filterOptions.sortFilter[$selectedCustomFilter][idxSortSelected].sortType = "asc", $filterOptions);
    			} else {
    				set_store_value(filterOptions, $filterOptions.sortFilter[$selectedCustomFilter][idxSortSelected].sortType = "desc", $filterOptions);
    			}
    		}

    		saveFilters("sort");
    	}

    	function handleDropdownKeyDown(event) {
    		let keyCode = event.which || event.keyCode || 0;

    		// 38up 40down 13enter
    		if (keyCode == 38 || keyCode == 40) {
    			var element = Array.from(document?.getElementsByClassName?.("options-wrap") || [])?.find?.(el => {
    				return !el?.classList?.contains?.("disable-interaction");
    			});

    			if (element?.closest?.(".filterType") || element?.closest?.(".sortFilter") || element?.closest?.(".filter-select") || element?.closest?.(".custom-filter-wrap")) {
    				event.preventDefault();

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
    							block: "nearest"
    						});
    					}
    				} else {
    					let options = element.querySelectorAll(".option:not(.disable-interaction)");
    					highlightedEl = options[0];

    					if (highlightedEl instanceof Element) {
    						addClass(highlightedEl, "highlight");
    						highlightedEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    			let idxTypeSelected = selectedFilterSelectionIdx;
    			$$invalidate(0, selectedCustomFilterElement = null);
    			$$invalidate(1, selectedFilterTypeElement = null);
    			$$invalidate(3, selectedSortElement = null);

    			if ($filterOptions?.filterSelection?.length > 0) {
    				$filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown.forEach(e => {
    					e.selected = false;
    				});

    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    			}

    			$$invalidate(2, selectedFilterElement = null);

    			if (highlightedEl instanceof Element) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}
    		}
    	}

    	async function handleGridView() {
    		set_store_value(gridFullView, $gridFullView = !$gridFullView, $gridFullView);

    		setLocalStorage($gridFullView, "gridFullView").catch(() => {
    			saveJSON($gridFullView, "gridFullView");
    			removeLocalStorage("gridFullView");
    		});
    	}

    	async function handleShowFilterOptions(event, val = null) {
    		$$invalidate(0, selectedCustomFilterElement = false);

    		if ($finalAnimeList?.length > 36 && !$gridFullView) {
    			await callAsyncAnimeReload();
    		}

    		$$invalidate(19, customFilterName = $selectedCustomFilter);
    		$$invalidate(16, editCustomFilterName = false);

    		if (typeof val === "boolean") {
    			set_store_value(showFilterOptions, $showFilterOptions = val, $showFilterOptions);
    		} else {
    			set_store_value(showFilterOptions, $showFilterOptions = !$showFilterOptions, $showFilterOptions);
    		}

    		setLocalStorage("showFilterOptions", $showFilterOptions).catch(() => {
    			removeLocalStorage("showFilterOptions");
    		});
    	}

    	let asyncAnimeReloadPromise;

    	function callAsyncAnimeReload() {
    		return new Promise(resolve => {
    				if ($animeLoaderWorker instanceof Worker) {
    					$checkAnimeLoaderStatus().then(() => {
    						set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);
    						$animeLoaderWorker?.postMessage?.({ reload: true });
    					}).catch(() => {
    						$confirmPromise({
    							isAlert: true,
    							title: "Something went wrong",
    							text: "Action failed, please try again."
    						});
    					});
    				}

    				asyncAnimeReloadPromise = { resolve };
    			});
    	}

    	asyncAnimeReloaded.subscribe(val => {
    		if (typeof val !== "boolean") return;
    		asyncAnimeReloadPromise?.resolve?.();
    	});

    	let previousCustomFilterName;

    	function handleCustomFilterPopup(event) {
    		let element = event.target;
    		let classList = element.classList;
    		let iconActions = element.closest(".custom-filter-icon-wrap");
    		if (iconActions || classList.contains("custom-filter-icon-wrap")) return;
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		let option = element.closest(".option");
    		if (option || classList.contains("option")) return;
    		let sortSelectEl = element.closest(".custom-filter-wrap");
    		let optionsWrap = element.closest(".options-wrap");

    		if ((classList.contains("custom-filter-wrap") || sortSelectEl) && !selectedCustomFilterElement && !classList.contains("closing-x")) {
    			$$invalidate(0, selectedCustomFilterElement = true);
    		} else if ((!optionsWrap || classList.contains("closing-x")) && !classList.contains("options-wrap")) {
    			if (highlightedEl instanceof Element && highlightedEl.closest(".custom-filter-wrap")) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}

    			$$invalidate(0, selectedCustomFilterElement = false);
    		}
    	}

    	async function selectCustomFilter(event, selectedCustomFilterName) {
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) return pleaseWaitAlert();
    		event?.stopPropagation?.();

    		if ((!$showFilterOptions || !isFullViewed) && document.documentElement.scrollTop > 48) {
    			window.scrollY = document.documentElement.scrollTop = 48;
    		}

    		if (isFullViewed) {
    			animeGridEl.style.overflow = "hidden";
    			animeGridEl.style.overflow = "";
    			animeGridEl.scroll({ left: 0, behavior: "smooth" });
    		}

    		if ($popupVisible) {
    			popupContainer.scrollTop = 0;
    		}

    		set_store_value(selectedCustomFilter, $selectedCustomFilter = selectedCustomFilterName, $selectedCustomFilter);
    		$$invalidate(0, selectedCustomFilterElement = false);
    	}

    	async function saveCustomFilterName(event) {
    		if (!$filterOptions || !isJsonObject($activeTagFilters) || !$selectedCustomFilter) return pleaseWaitAlert();

    		if (customFilterName && $selectedCustomFilter !== customFilterName) {
    			let customFilterNameToShow = `<span style="color:#00cbf9;">${trimAllEmptyChar(customFilterName)}</span>`;

    			if (await $confirmPromise({
    				title: "Save custom filter",
    				text: `Do you want to change the custom filter name to ${customFilterNameToShow}?`
    			})) {
    				if (customFilterName && $selectedCustomFilter !== customFilterName) {
    					$$invalidate(16, editCustomFilterName = false);
    					$$invalidate(60, previousCustomFilterName = $selectedCustomFilter);
    					let savedCustomFilterName = customFilterName || "Custom Filter " + new Date().getTime();

    					if (isJsonObject($filterOptions?.sortFilter)) {
    						set_store_value(filterOptions, $filterOptions.sortFilter[savedCustomFilterName] = JSON.parse(JSON.stringify($filterOptions.sortFilter?.[previousCustomFilterName] || sortFilterContents)), $filterOptions);
    					}

    					set_store_value(activeTagFilters, $activeTagFilters[savedCustomFilterName] = JSON.parse(JSON.stringify($activeTagFilters?.[previousCustomFilterName])), $activeTagFilters);
    					delete $activeTagFilters?.[previousCustomFilterName];
    					delete $filterOptions?.sortFilter?.[previousCustomFilterName];
    					set_store_value(selectedCustomFilter, $selectedCustomFilter = savedCustomFilterName, $selectedCustomFilter);
    					activeTagFilters.set($activeTagFilters);
    					await saveJSON($filterOptions, "filterOptions");
    					await saveJSON($activeTagFilters, "activeTagFilters");
    					await saveJSON($selectedCustomFilter, "selectedCustomFilter");
    				}
    			}
    		}
    	}

    	async function addCustomFilter() {
    		if (!$filterOptions || !isJsonObject($activeTagFilters) || !$selectedCustomFilter) return pleaseWaitAlert();

    		if (customFilterName && $activeTagFilters && !$activeTagFilters?.[customFilterName]) {
    			let customFilterNameToShow = `<span style="color:#00cbf9;">${trimAllEmptyChar(customFilterName)}</span>`;

    			if (await $confirmPromise({
    				title: "Add custom filter",
    				text: `Do you want to add the custom filter named ${customFilterNameToShow}?`
    			})) {
    				if (customFilterName && $activeTagFilters && !$activeTagFilters?.[customFilterName]) {
    					$$invalidate(16, editCustomFilterName = false);
    					let previousCustomFilterName = $selectedCustomFilter;
    					let addedCustomFilterName = customFilterName || "Custom Filter " + new Date().getTime();

    					if (isJsonObject($filterOptions.sortFilter)) {
    						set_store_value(filterOptions, $filterOptions.sortFilter[addedCustomFilterName] = JSON.parse(JSON.stringify($filterOptions?.sortFilter?.[previousCustomFilterName] || sortFilterContents)), $filterOptions);
    					}

    					set_store_value(activeTagFilters, $activeTagFilters[addedCustomFilterName] = JSON.parse(JSON.stringify($activeTagFilters?.[previousCustomFilterName])), $activeTagFilters);
    					set_store_value(selectedCustomFilter, $selectedCustomFilter = addedCustomFilterName, $selectedCustomFilter);
    					activeTagFilters.set($activeTagFilters);
    					await saveJSON($filterOptions, "filterOptions");
    					await saveJSON($activeTagFilters, "activeTagFilters");
    					await saveJSON($selectedCustomFilter, "selectedCustomFilter");
    				}
    			}
    		}
    	}

    	async function removeCustomFilter() {
    		if (!$filterOptions || !isJsonObject($activeTagFilters) || !$selectedCustomFilter) return pleaseWaitAlert();

    		if ($selectedCustomFilter && $activeTagFilters && $activeTagFilters?.[$selectedCustomFilter] && Object.keys($activeTagFilters || {}).length > 1) {
    			let customFilterNameToShow = `<span style="color:#00cbf9;">${trimAllEmptyChar($selectedCustomFilter)}</span>`;

    			if (await $confirmPromise({
    				title: "Delete custom filter",
    				text: `Do you want to delete the custom filter named ${customFilterNameToShow}?`
    			})) {
    				if ($selectedCustomFilter && $activeTagFilters && $activeTagFilters?.[$selectedCustomFilter] && Object.keys($activeTagFilters || {}).length > 1) {
    					set_store_value(loadingFilterOptions, $loadingFilterOptions = true, $loadingFilterOptions);
    					$$invalidate(16, editCustomFilterName = false);
    					let newCustomFilterName;

    					for (let key in $activeTagFilters) {
    						if (key !== $selectedCustomFilter) {
    							newCustomFilterName = key;
    							break;
    						}
    					}

    					delete $filterOptions?.sortFilter?.[$selectedCustomFilter];
    					delete $activeTagFilters?.[$selectedCustomFilter];
    					activeTagFilters.set($activeTagFilters);
    					set_store_value(selectedCustomFilter, $selectedCustomFilter = newCustomFilterName, $selectedCustomFilter);
    				}
    			}
    		} else {
    			$confirmPromise({
    				isAlert: true,
    				title: "Action failed",
    				text: "Requires atleast one custom filter."
    			});
    		}
    	}

    	function getTagCategoryData() {
    		fetch("https://graphql.anilist.co", {
    			method: "POST",
    			headers: {
    				"Content-Type": "application/json",
    				Accept: "application/json"
    			},
    			body: JSON.stringify({
    				query: `{MediaTagCollection{name category description}}`
    			})
    		}).then(async response => {
    			return await response?.json?.();
    		}).then(async result => {
    			let mediaTagCollection = result?.data?.MediaTagCollection || [];

    			for (let i = 0; i < mediaTagCollection?.length; i++) {
    				let tagCollected = mediaTagCollection?.[i];
    				let category = tagCollected?.category;
    				let tag = tagCollected?.name;
    				let description = tagCollected?.description;
    				if (!tag || !category) continue;
    				category = cleanText(category);
    				tag = cleanText(tag);

    				if (!isJsonObject(tagCategoryInfo?.[category])) {
    					$$invalidate(11, tagCategoryInfo[category] = {}, tagCategoryInfo);
    				}

    				$$invalidate(11, tagCategoryInfo[category][tag] = description || "", tagCategoryInfo);
    			}

    			setLocalStorage("tagCategoryInfo", JSON.stringify(tagCategoryInfo));
    			await saveJSON(tagCategoryInfo, "tagCategoryInfo");
    			let lastTagCategoryInfoUpdate = new Date();
    			setLocalStorage("lastTagCategoryInfoUpdate", JSON.stringify(lastTagCategoryInfoUpdate));
    			saveJSON(lastTagCategoryInfoUpdate, "lastTagCategoryInfoUpdate");
    		});
    	}

    	function getTagFilterInfoText({ tag, category }, infoToGet) {
    		if (infoToGet === "tag category" && tag != null) {
    			for (let eCategory in tagCategoryInfo) {
    				for (let eTag in tagCategoryInfo[eCategory]) {
    					if (eTag === tag) {
    						return eCategory || "";
    					}
    				}
    			}
    		} else if (infoToGet === "category and description" && tag != null) {
    			if (category == null) {
    				category = getTagFilterInfoText({ tag }, "tag category");
    			}

    			let description = tagCategoryInfo?.[category]?.[tag];

    			if (description) {
    				return `Description: ${description}\nCategory: ${category}`;
    			}
    		} else if (infoToGet === "all tags" && category != null) {
    			let categoryInfo = tagCategoryInfo?.[category];
    			let categoryTagsArray = Object.keys(categoryInfo || {});

    			if (!jsonIsEmpty(categoryInfo)) {
    				return categoryTagsArray.join(", ");
    			}
    		}

    		return "";
    	}

    	function getTagCategoryInfoHTML(tagCategory) {
    		let categoryInfo = tagCategoryInfo?.[tagCategory];
    		if (!tagCategory || !isJsonObject(categoryInfo) || jsonIsEmpty(categoryInfo)) return "";
    		let tagCategoryList = "";
    		let tagCategoryListArray = Object.keys(tagCategoryInfo?.[tagCategory]) || [];

    		for (let i = 0; i < tagCategoryListArray.length; i++) {
    			tagCategoryList += `
                <li onclick="window?.showTagInfoHTML?.(event,'${tagCategoryListArray[i]}','${tagCategory}')">
                    ${tagCategoryListArray[i]}
                </li>
            `;
    		}

    		return `
            <div class="is-custom-table">
                <header class="custom-header">
                    <h1 class="custom-h1">${tagCategory}</h1>
                </header>
                <ul class="custom-table-list">
                    ${tagCategoryList}
                </ul> 
            </div>
        `;
    	}

    	function getTagInfoHTML(tag, tagCategory) {
    		if (tagCategory == null) {
    			tagCategory = getTagFilterInfoText({ tag }, "tag category");
    		}

    		let description = tagCategoryInfo?.[tagCategory]?.[tag];
    		if (!tagCategory || !description) return "";

    		return `
            <div class="is-custom-table">
                <header class="custom-header">
                    <h1 class="custom-h1">${tag}</h1>
                    <h4 class="custom-extra" onclick="window?.showTagCategoryInfoHTML?.(event,'${tagCategory}')">${tagCategory}</h4>
                </header>
                <div class="custom-description">${description}</div>
            </div>
        `;
    	}

    	window.getTagInfoHTML = getTagInfoHTML;

    	window.showTagInfoHTML = (event, tag, tagCategory) => {
    		event.stopPropagation();
    		let tagInfoHTML = getTagInfoHTML(tag, tagCategory);

    		if (tagInfoHTML) {
    			window?.showFullScreenInfo?.(tagInfoHTML);
    		}
    	};

    	window.showTagCategoryInfoHTML = (event, tagCategory) => {
    		event.stopPropagation();
    		let tagCategoryInfoHTML = getTagCategoryInfoHTML(tagCategory);

    		if (tagCategoryInfoHTML) {
    			window?.showFullScreenInfo?.(tagCategoryInfoHTML);
    		}
    	};

    	let editCustomFilterName = false;

    	dropdownIsVisible.subscribe(val => {
    		if (val === false && windowWidth <= 425) {
    			// Small Screen Width
    			if (highlightedEl instanceof Element) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}

    			// Close Custom Filter Dropdown
    			$$invalidate(0, selectedCustomFilterElement = false);

    			// Close Filter Type Dropdown
    			$$invalidate(1, selectedFilterTypeElement = false);

    			// Close Sort Filter Dropdown
    			$$invalidate(3, selectedSortElement = false);

    			// Close Filter Selection Dropdown
    			let idxTypeSelected = selectedFilterSelectionIdx;

    			$filterOptions?.filterSelection?.[idxTypeSelected]?.filters?.Dropdown?.forEach?.(e => {
    				if (e?.selected != null) {
    					e.selected = false;
    				}
    			});

    			if (idxTypeSelected != null && $filterOptions?.filterSelection?.[idxTypeSelected]) {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    			}

    			$$invalidate(2, selectedFilterElement = null);
    		}
    	});

    	function hasTagCategoryInfoData() {
    		for (let category in tagCategoryInfo) {
    			for (let tag in tagCategoryInfo[category]) {
    				return typeof tagCategoryInfo[category][tag] === "string";
    			}

    			return false;
    		}

    		return false;
    	}

    	onMount(async () => {
    		// Init
    		let filterEl = document.getElementById("filters");

    		filterEl.addEventListener("scroll", handleFilterScroll, { passive: true });
    		animeGridEl = document.getElementById("anime-grid");
    		popupContainer = document?.getElementById("popup-container");

    		dragScroll(filterEl, "x", event => {
    			let element = event?.target;
    			return selectedFilterElement && (element?.classList?.contains?.("options-wrap") || element?.closest?.(".options-wrap"));
    		});

    		document.addEventListener("keydown", handleDropdownKeyDown);
    		window.addEventListener("resize", windowResized);
    		window.addEventListener("click", clickOutsideListener);

    		//
    		let tempTagCategoryInfo = getLocalStorage("tagCategoryInfo") || await retrieveJSON("tagCategoryInfo");

    		if (isJsonObject(tempTagCategoryInfo)) {
    			$$invalidate(11, tagCategoryInfo = tempTagCategoryInfo);
    		}

    		let lastTagCategoryInfoUpdateTimestamp = new Date(getLocalStorage("lastTagCategoryInfoUpdate") || await retrieveJSON("lastTagCategoryInfoUpdate")).getTime();

    		if (lastTagCategoryInfoUpdateTimestamp > 0 && hasTagCategoryInfoData()) {
    			let nextSeasonAverageTimestamp = 7884000000;
    			let nextSeason = new Date(lastTagCategoryInfoUpdateTimestamp + nextSeasonAverageTimestamp);

    			if (nextSeason.getTime() < new Date().getTime()) {
    				getTagCategoryData();
    			}
    		} else {
    			getTagCategoryData();
    		}
    	});

    	function pleaseWaitAlert() {
    		$confirmPromise({
    			isAlert: true,
    			title: "Initializing resources",
    			text: "Please wait a moment..."
    		});
    	}

    	let shouldScrollSnap = getLocalStorage("nonScrollSnapFilters") ?? true;
    	let homeStatusClick = 0;
    	const writable_props = [];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Search> was created with unknown prop '${key}'`);
    	});

    	const func = (Dropdown, { optionName }) => hasPartialMatch(optionName, Dropdown?.optKeyword) || Dropdown?.optKeyword === "";

    	function input0_input_handler() {
    		customFilterName = this.value;
    		($$invalidate(19, customFilterName), $$invalidate(6, $selectedCustomFilter));
    	}

    	const keydown_handler = e => e.key === "Enter" && handleCustomFilterPopup(e);
    	const click_handler = (filterName, e) => selectCustomFilter(e, filterName);
    	const keydown_handler_1 = (filterName, e) => e.key === "Enter" && selectCustomFilter(e, filterName);

    	const click_handler_1 = () => {
    		if (!$selectedCustomFilter || !customFilterName || !$activeTagFilters || $activeTagFilters?.[customFilterName]) return;
    		saveCustomFilterName();
    	};

    	const keydown_handler_2 = e => {
    		if (e.key !== "Enter") return;
    		if (!$selectedCustomFilter || !customFilterName || !$activeTagFilters || $activeTagFilters?.[customFilterName]) return;
    		saveCustomFilterName();
    	};

    	const click_handler_2 = () => {
    		$$invalidate(16, editCustomFilterName = !editCustomFilterName);
    		$$invalidate(19, customFilterName = $selectedCustomFilter);
    		$$invalidate(0, selectedCustomFilterElement = false);
    	};

    	const keydown_handler_3 = e => {
    		if (e.key !== "Enter") return;
    		$$invalidate(16, editCustomFilterName = !editCustomFilterName);
    		$$invalidate(19, customFilterName = $selectedCustomFilter);
    		$$invalidate(0, selectedCustomFilterElement = false);
    	};

    	const keydown_handler_4 = e => e.key === "Enter" && handleShowFilterOptions();
    	const keydown_handler_5 = e => e.key === "Enter" && handleCustomFilterPopup(e);
    	const keydown_handler_6 = e => e.key === "Enter" && handleShowFilterTypes(e);
    	const click_handler_3 = (filterSelection, e) => handleFilterTypes(e, filterSelection?.filterSelectionName);
    	const keydown_handler_7 = (filterSelection, e) => e.key === "Enter" && handleFilterTypes(e, filterSelection?.filterSelectionName);
    	const keydown_handler_8 = e => e.key === "Enter" && handleShowFilterTypes(e);
    	const click_handler_4 = e => $customFilters?.length > 1 && removeCustomFilter();
    	const keydown_handler_9 = e => $customFilters?.length > 1 && e.key === "Enter" && removeCustomFilter();

    	const click_handler_5 = e => {
    		if (!customFilterName || !$activeTagFilters || $activeTagFilters?.[customFilterName]) return;
    		addCustomFilter();
    	};

    	const keydown_handler_10 = e => {
    		if (e.key !== "Enter" || !customFilterName || !$activeTagFilters || $activeTagFilters?.[customFilterName]) return;
    		addCustomFilter();
    	};

    	function input0_input_handler_1(filSelIdx, dropdownIdx) {
    		$filterOptions.filterSelection[filSelIdx].filters.Dropdown[dropdownIdx].optKeyword = this.value;
    		filterOptions.set($filterOptions);
    	}

    	const keydown_handler_11 = (dropdownIdx, e) => e.key === "Enter" && closeFilterSelect(dropdownIdx);
    	const keydown_handler_12 = (dropdownIdx, e) => (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") && filterSelect(e, dropdownIdx);

    	const click_handler_6 = (dropdownIdx, e) => {
    		filterSelect(e, dropdownIdx);
    	};

    	const keydown_handler_13 = (dropdownIdx, e) => e.key === "Enter" && closeFilterSelect(dropdownIdx);

    	function input1_input_handler(filSelIdx, dropdownIdx) {
    		$filterOptions.filterSelection[filSelIdx].filters.Dropdown[dropdownIdx].optKeyword = this.value;
    		filterOptions.set($filterOptions);
    	}

    	const click_handler_7 = (Dropdown, option) => {
    		let htmlToShow = "";

    		if (Dropdown.filName === "tag") {
    			htmlToShow = getTagInfoHTML(option?.optionName);
    		} else if (Dropdown.filName === "tag category") {
    			htmlToShow = getTagCategoryInfoHTML(option?.optionName);
    		}

    		window?.showFullScreenInfo?.(htmlToShow);
    	};

    	const keydown_handler_14 = (Dropdown, option, e) => {
    		if (e.key === "Enter") {
    			let htmlToShow = "";

    			if (Dropdown.filName === "tag") {
    				htmlToShow = getTagInfoHTML(option?.optionName);
    			} else if (Dropdown.filName === "tag category") {
    				htmlToShow = getTagCategoryInfoHTML(option?.optionName);
    			}

    			window?.showFullScreenInfo?.(htmlToShow);
    		}
    	};

    	const keydown_handler_15 = (option, Dropdown, optionIdx, dropdownIdx, filterSelection, e) => e.key === "Enter" && handleFilterSelectOptionChange(option.optionName, Dropdown.filName, optionIdx, dropdownIdx, Dropdown.changeType, filterSelection.filterSelectionName);

    	const change_handler = async (Checkbox, checkboxIdx, filterSelection, e) => {
    		if (!$filterOptions || !$activeTagFilters || !$selectedCustomFilter) {
    			return pleaseWaitAlert();
    		} else {
    			handleCheckboxChange(e, Checkbox.filName, checkboxIdx, filterSelection.filterSelectionName);
    		}
    	};

    	function input_change_handler(each_value_4, checkboxIdx) {
    		each_value_4[checkboxIdx].isSelected = this.checked;
    	}

    	const click_handler_8 = (Checkbox, checkboxIdx, filterSelection, e) => handleCheckboxChange(e, Checkbox.filName, checkboxIdx, filterSelection.filterSelectionName);
    	const keydown_handler_16 = (Checkbox, checkboxIdx, filterSelection, e) => e.key === "Enter" && handleCheckboxChange(e, Checkbox.filName, checkboxIdx, filterSelection.filterSelectionName);
    	const input_handler = (inputNumIdx, inputNum, filterSelection, e) => handleInputNumber(e, e.target.value, inputNumIdx, inputNum.filName, inputNum.maxValue, inputNum.minValue, filterSelection.filterSelectionName);

    	const wheel_handler_2 = e => {
    		horizontalWheel(e, "filters");

    		if (isFullViewed) {
    			if (!scrollingToTop && e.deltaY < 0) {
    				$$invalidate(12, scrollingToTop = true);
    				let newScrollPosition = 0;
    				document.documentElement.scrollTop = newScrollPosition;
    				$$invalidate(12, scrollingToTop = false);
    			}
    		}
    	};

    	const keydown_handler_17 = e => e.key === "Enter" && removeAllActiveTag();
    	const click_handler_9 = (activeTagFiltersArray, e) => removeActiveTag(e, activeTagFiltersArray?.optionIdx, activeTagFiltersArray?.optionName, activeTagFiltersArray?.filterType, activeTagFiltersArray?.categIdx, activeTagFiltersArray?.optionType);
    	const keydown_handler_18 = (activeTagFiltersArray, e) => e.key === "Enter" && removeActiveTag(e, activeTagFiltersArray?.optionIdx, activeTagFiltersArray?.optionName, activeTagFiltersArray?.filterType, activeTagFiltersArray?.categIdx, activeTagFiltersArray?.optionType);
    	const click_handler_10 = (activeTagFiltersArray, e) => changeActiveSelect(e, activeTagFiltersArray?.optionIdx, activeTagFiltersArray?.optionName, activeTagFiltersArray?.filterType, activeTagFiltersArray?.categIdx, activeTagFiltersArray?.changeType, activeTagFiltersArray?.optionType, activeTagFiltersArray?.optionValue);
    	const keydown_handler_19 = (activeTagFiltersArray, e) => e.key === "Enter" && changeActiveSelect(e, activeTagFiltersArray?.optionIdx, activeTagFiltersArray?.optionName, activeTagFiltersArray?.filterType, activeTagFiltersArray?.categIdx, activeTagFiltersArray?.changeType, activeTagFiltersArray?.optionType, activeTagFiltersArray?.optionValue);

    	const click_handler_11 = async e => {
    		await getExtraInfo();

    		if (homeStatusClick < 6 && !$initData) {
    			$$invalidate(17, ++homeStatusClick);
    		} else {
    			$$invalidate(17, homeStatusClick = 0);
    		}
    	};

    	function input1_input_handler_1() {
    		$searchedAnimeKeyword = this.value;
    		searchedAnimeKeyword.set($searchedAnimeKeyword);
    	}

    	const keydown_handler_21 = e => e.key === "Enter" && handleGridView();
    	const keydown_handler_22 = e => e.key === "Enter" && changeSortType();
    	const keydown_handler_23 = e => e.key === "Enter" && handleSortFilterPopup(e);
    	const keydown_handler_24 = e => e.key === "Enter" && handleSortFilterPopup(e);
    	const keydown_handler_25 = (sortFilter, e) => e.key === "Enter" && changeSort(sortFilter?.sortName);

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(62, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		retrieveJSON,
    		saveJSON,
    		android: android$1,
    		finalAnimeList,
    		animeLoaderWorker: animeLoaderWorker$1,
    		filterOptions,
    		selectedCustomFilter,
    		activeTagFilters,
    		searchedAnimeKeyword,
    		dataStatus,
    		initData,
    		confirmPromise,
    		asyncAnimeReloaded,
    		checkAnimeLoaderStatus,
    		gridFullView,
    		hasWheel,
    		updateFilters,
    		isImporting,
    		hiddenEntries,
    		extraInfo,
    		loadingFilterOptions,
    		customFilters,
    		showFilterOptions,
    		dropdownIsVisible,
    		popupVisible,
    		showStatus,
    		newFinalAnime,
    		fade,
    		addClass,
    		changeInputValue,
    		dragScroll,
    		removeClass,
    		getLocalStorage,
    		trimAllEmptyChar,
    		isJsonObject,
    		jsonIsEmpty,
    		setLocalStorage,
    		removeLocalStorage,
    		animeLoader: animeLoader$1,
    		getExtraInfo,
    		processRecommendedAnimeList,
    		Init,
    		windowWidth,
    		windowHeight,
    		maxFilterSelectionHeight,
    		animeGridEl,
    		popupContainer,
    		selectedCustomFilterElement,
    		selectedFilterTypeElement,
    		selectedFilterElement,
    		selectedSortElement,
    		highlightedEl,
    		filterScrollTimeout,
    		filterIsScrolling,
    		tagCategoryInfo,
    		nameChangeUpdateProcessedList,
    		nameChangeUpdateFinalList,
    		conditionalInputNumberList,
    		isUpdatingRec,
    		isLoadingAnime,
    		scrollingToTop,
    		activeTagFiltersArrays,
    		selectedFilterSelectionIdx,
    		selectedFilterSelectionName,
    		selectedSortIdx,
    		selectedSort,
    		selectedSortName,
    		selectedSortType,
    		sortFilterContents,
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
    		asyncAnimeReloadPromise,
    		callAsyncAnimeReload,
    		hasPartialMatch,
    		previousCustomFilterName,
    		arraysAreEqual,
    		handleCustomFilterPopup,
    		selectCustomFilter,
    		saveCustomFilterName,
    		addCustomFilter,
    		removeCustomFilter,
    		getTagCategoryData,
    		getTagFilterInfoText,
    		getTagCategoryInfoHTML,
    		getTagInfoHTML,
    		cleanText,
    		editCustomFilterName,
    		hasTagCategoryInfoData,
    		pleaseWaitAlert,
    		horizontalWheel,
    		shouldScrollSnap,
    		homeStatusClick,
    		isFullViewed,
    		customFilterName,
    		$gridFullView,
    		$confirmPromise,
    		$filterOptions,
    		$dropdownIsVisible,
    		$selectedCustomFilter,
    		$activeTagFilters,
    		$loadingFilterOptions,
    		$popupVisible,
    		$showFilterOptions,
    		$animeLoaderWorker,
    		$finalAnimeList,
    		$checkAnimeLoaderStatus,
    		$dataStatus,
    		$hiddenEntries,
    		$newFinalAnime,
    		$isImporting,
    		$customFilters,
    		$initData,
    		$hasWheel,
    		$android,
    		$showStatus,
    		$extraInfo,
    		$searchedAnimeKeyword
    	});

    	$$self.$inject_state = $$props => {
    		if ('Init' in $$props) $$invalidate(8, Init = $$props.Init);
    		if ('windowWidth' in $$props) $$invalidate(9, windowWidth = $$props.windowWidth);
    		if ('windowHeight' in $$props) windowHeight = $$props.windowHeight;
    		if ('maxFilterSelectionHeight' in $$props) $$invalidate(10, maxFilterSelectionHeight = $$props.maxFilterSelectionHeight);
    		if ('animeGridEl' in $$props) animeGridEl = $$props.animeGridEl;
    		if ('popupContainer' in $$props) popupContainer = $$props.popupContainer;
    		if ('selectedCustomFilterElement' in $$props) $$invalidate(0, selectedCustomFilterElement = $$props.selectedCustomFilterElement);
    		if ('selectedFilterTypeElement' in $$props) $$invalidate(1, selectedFilterTypeElement = $$props.selectedFilterTypeElement);
    		if ('selectedFilterElement' in $$props) $$invalidate(2, selectedFilterElement = $$props.selectedFilterElement);
    		if ('selectedSortElement' in $$props) $$invalidate(3, selectedSortElement = $$props.selectedSortElement);
    		if ('highlightedEl' in $$props) highlightedEl = $$props.highlightedEl;
    		if ('filterScrollTimeout' in $$props) filterScrollTimeout = $$props.filterScrollTimeout;
    		if ('filterIsScrolling' in $$props) filterIsScrolling = $$props.filterIsScrolling;
    		if ('tagCategoryInfo' in $$props) $$invalidate(11, tagCategoryInfo = $$props.tagCategoryInfo);
    		if ('nameChangeUpdateProcessedList' in $$props) nameChangeUpdateProcessedList = $$props.nameChangeUpdateProcessedList;
    		if ('nameChangeUpdateFinalList' in $$props) nameChangeUpdateFinalList = $$props.nameChangeUpdateFinalList;
    		if ('conditionalInputNumberList' in $$props) $$invalidate(30, conditionalInputNumberList = $$props.conditionalInputNumberList);
    		if ('isUpdatingRec' in $$props) isUpdatingRec = $$props.isUpdatingRec;
    		if ('isLoadingAnime' in $$props) isLoadingAnime = $$props.isLoadingAnime;
    		if ('scrollingToTop' in $$props) $$invalidate(12, scrollingToTop = $$props.scrollingToTop);
    		if ('activeTagFiltersArrays' in $$props) $$invalidate(13, activeTagFiltersArrays = $$props.activeTagFiltersArrays);
    		if ('selectedFilterSelectionIdx' in $$props) $$invalidate(57, selectedFilterSelectionIdx = $$props.selectedFilterSelectionIdx);
    		if ('selectedFilterSelectionName' in $$props) $$invalidate(4, selectedFilterSelectionName = $$props.selectedFilterSelectionName);
    		if ('selectedSortIdx' in $$props) $$invalidate(58, selectedSortIdx = $$props.selectedSortIdx);
    		if ('selectedSort' in $$props) $$invalidate(59, selectedSort = $$props.selectedSort);
    		if ('selectedSortName' in $$props) $$invalidate(14, selectedSortName = $$props.selectedSortName);
    		if ('selectedSortType' in $$props) $$invalidate(15, selectedSortType = $$props.selectedSortType);
    		if ('sortFilterContents' in $$props) $$invalidate(31, sortFilterContents = $$props.sortFilterContents);
    		if ('asyncAnimeReloadPromise' in $$props) asyncAnimeReloadPromise = $$props.asyncAnimeReloadPromise;
    		if ('previousCustomFilterName' in $$props) $$invalidate(60, previousCustomFilterName = $$props.previousCustomFilterName);
    		if ('editCustomFilterName' in $$props) $$invalidate(16, editCustomFilterName = $$props.editCustomFilterName);
    		if ('shouldScrollSnap' in $$props) $$invalidate(56, shouldScrollSnap = $$props.shouldScrollSnap);
    		if ('homeStatusClick' in $$props) $$invalidate(17, homeStatusClick = $$props.homeStatusClick);
    		if ('isFullViewed' in $$props) $$invalidate(18, isFullViewed = $$props.isFullViewed);
    		if ('customFilterName' in $$props) $$invalidate(19, customFilterName = $$props.customFilterName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*$filterOptions*/ 32) {
    			$$invalidate(57, selectedFilterSelectionIdx = $filterOptions?.filterSelection?.findIndex?.(({ isSelected }) => isSelected));
    		}

    		if ($$self.$$.dirty[0] & /*$filterOptions*/ 32 | $$self.$$.dirty[1] & /*selectedFilterSelectionIdx*/ 67108864) {
    			$$invalidate(4, selectedFilterSelectionName = $filterOptions?.filterSelection?.[selectedFilterSelectionIdx]?.filterSelectionName);
    		}

    		if ($$self.$$.dirty[0] & /*$activeTagFilters, $selectedCustomFilter, selectedFilterSelectionName*/ 208) {
    			$$invalidate(13, activeTagFiltersArrays = $activeTagFilters?.[$selectedCustomFilter]?.[selectedFilterSelectionName] || []);
    		}

    		if ($$self.$$.dirty[0] & /*$filterOptions, $selectedCustomFilter*/ 96) {
    			$$invalidate(58, selectedSortIdx = $filterOptions?.sortFilter?.[$selectedCustomFilter]?.findIndex?.(({ sortType }) => sortType !== "none") || 0);
    		}

    		if ($$self.$$.dirty[0] & /*$filterOptions, $selectedCustomFilter*/ 96 | $$self.$$.dirty[1] & /*selectedSortIdx*/ 134217728) {
    			$$invalidate(59, selectedSort = $filterOptions?.sortFilter?.[$selectedCustomFilter]?.[selectedSortIdx] || {
    				sortName: "weighted score",
    				sortType: "desc"
    			});
    		}

    		if ($$self.$$.dirty[1] & /*selectedSort*/ 268435456) {
    			$$invalidate(14, selectedSortName = selectedSort?.sortName);
    		}

    		if ($$self.$$.dirty[1] & /*selectedSort*/ 268435456) {
    			$$invalidate(15, selectedSortType = selectedSort?.sortType);
    		}

    		if ($$self.$$.dirty[0] & /*$selectedCustomFilter*/ 64) {
    			$$invalidate(19, customFilterName = $selectedCustomFilter || getLocalStorage("selectedCustomFilter"));
    		}

    		if ($$self.$$.dirty[0] & /*$selectedCustomFilter, $activeTagFilters*/ 192 | $$self.$$.dirty[1] & /*previousCustomFilterName*/ 536870912) {
    			{
    				if ($selectedCustomFilter) {
    					if (previousCustomFilterName !== $selectedCustomFilter) {
    						set_store_value(loadingFilterOptions, $loadingFilterOptions = true, $loadingFilterOptions);
    						let array1 = $activeTagFilters?.[previousCustomFilterName]?.["Algorithm Filter"] || [];
    						let array2 = $activeTagFilters?.[$selectedCustomFilter]?.["Algorithm Filter"] || [];

    						if (arraysAreEqual(array1, array2)) {
    							_loadAnime(false);
    						} else {
    							_processRecommendedAnimeList();
    						}
    					}

    					$$invalidate(60, previousCustomFilterName = $selectedCustomFilter);
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*selectedCustomFilterElement, selectedFilterElement, selectedFilterTypeElement, selectedSortElement*/ 15) {
    			{
    				set_store_value(dropdownIsVisible, $dropdownIsVisible = selectedCustomFilterElement || selectedFilterElement || selectedFilterTypeElement || selectedSortElement, $dropdownIsVisible);
    			}
    		}

    		if ($$self.$$.dirty[1] & /*$gridFullView*/ 1073741824) {
    			$$invalidate(18, isFullViewed = $gridFullView ?? getLocalStorage("gridFullView") ?? false);
    		}
    	};

    	return [
    		selectedCustomFilterElement,
    		selectedFilterTypeElement,
    		selectedFilterElement,
    		selectedSortElement,
    		selectedFilterSelectionName,
    		$filterOptions,
    		$selectedCustomFilter,
    		$activeTagFilters,
    		Init,
    		windowWidth,
    		maxFilterSelectionHeight,
    		tagCategoryInfo,
    		scrollingToTop,
    		activeTagFiltersArrays,
    		selectedSortName,
    		selectedSortType,
    		editCustomFilterName,
    		homeStatusClick,
    		isFullViewed,
    		customFilterName,
    		$loadingFilterOptions,
    		$showFilterOptions,
    		$dataStatus,
    		$customFilters,
    		$initData,
    		$hasWheel,
    		$android,
    		$showStatus,
    		$extraInfo,
    		$searchedAnimeKeyword,
    		conditionalInputNumberList,
    		sortFilterContents,
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
    		handleCustomFilterPopup,
    		selectCustomFilter,
    		saveCustomFilterName,
    		addCustomFilter,
    		removeCustomFilter,
    		getTagFilterInfoText,
    		getTagCategoryInfoHTML,
    		getTagInfoHTML,
    		pleaseWaitAlert,
    		shouldScrollSnap,
    		selectedFilterSelectionIdx,
    		selectedSortIdx,
    		selectedSort,
    		previousCustomFilterName,
    		$gridFullView,
    		$$scope,
    		slots,
    		func,
    		input0_input_handler,
    		keydown_handler,
    		click_handler,
    		keydown_handler_1,
    		click_handler_1,
    		keydown_handler_2,
    		click_handler_2,
    		keydown_handler_3,
    		keydown_handler_4,
    		keydown_handler_5,
    		keydown_handler_6,
    		click_handler_3,
    		keydown_handler_7,
    		keydown_handler_8,
    		click_handler_4,
    		keydown_handler_9,
    		click_handler_5,
    		keydown_handler_10,
    		input0_input_handler_1,
    		keydown_handler_11,
    		keydown_handler_12,
    		click_handler_6,
    		keydown_handler_13,
    		input1_input_handler,
    		click_handler_7,
    		keydown_handler_14,
    		keydown_handler_15,
    		change_handler,
    		input_change_handler,
    		click_handler_8,
    		keydown_handler_16,
    		input_handler,
    		wheel_handler_2,
    		keydown_handler_17,
    		click_handler_9,
    		keydown_handler_18,
    		click_handler_10,
    		keydown_handler_19,
    		click_handler_11,
    		input1_input_handler_1,
    		keydown_handler_21,
    		keydown_handler_22,
    		keydown_handler_23,
    		keydown_handler_24,
    		keydown_handler_25
    	];
    }

    class Search extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, null, [-1, -1, -1, -1, -1, -1]);

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

    // (76:0) {#if showConfirm}
    function create_if_block$1(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let div0;
    	let h20;

    	let t0_value = (/*shouldShowPleaseWait*/ ctx[7]
    	? "Initializing resources"
    	: /*confirmTitle*/ ctx[2]) + "";

    	let t0;
    	let t1;
    	let h21;

    	let raw_value = (/*shouldShowPleaseWait*/ ctx[7]
    	? "Please wait a moment..."
    	: /*confirmText*/ ctx[3]) + "";

    	let t2;
    	let div1;
    	let t3;
    	let button;
    	let t4;
    	let div2_outro;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = !/*isAlert*/ ctx[1] && !/*shouldShowPleaseWait*/ ctx[7] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			h20 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			h21 = element("h2");
    			t2 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t3 = space();
    			button = element("button");
    			t4 = text(/*confirmLabel*/ ctx[4]);
    			attr_dev(h20, "class", "confirm-title svelte-iuqa3i");
    			add_location(h20, file$1, 85, 20, 2680);
    			attr_dev(h21, "class", "confirm-text svelte-iuqa3i");
    			add_location(h21, file$1, 90, 20, 2903);
    			attr_dev(div0, "class", "confirm-info-container svelte-iuqa3i");
    			add_location(div0, file$1, 84, 16, 2622);
    			attr_dev(button, "class", "button svelte-iuqa3i");
    			add_location(button, file$1, 106, 20, 3627);
    			attr_dev(div1, "class", "confirm-button-container svelte-iuqa3i");
    			add_location(div1, file$1, 96, 16, 3151);
    			attr_dev(div2, "class", "confirm-container svelte-iuqa3i");
    			add_location(div2, file$1, 83, 12, 2544);
    			attr_dev(div3, "class", "confirm-wrapper svelte-iuqa3i");
    			add_location(div3, file$1, 82, 8, 2501);
    			attr_dev(div4, "class", "confirm svelte-iuqa3i");
    			add_location(div4, file$1, 76, 4, 2279);
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
    			h21.innerHTML = raw_value;
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t3);
    			append_dev(div1, button);
    			append_dev(button, t4);
    			/*button_binding*/ ctx[14](button);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*handleConfirm*/ ctx[8], false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler_1*/ ctx[15], false, false, false, false),
    					listen_dev(div4, "click", /*handleConfirmVisibility*/ ctx[10], false, false, false, false),
    					listen_dev(div4, "touchend", /*handleConfirmVisibility*/ ctx[10], { passive: true }, false, false, false),
    					listen_dev(div4, "keydown", /*keydown_handler_2*/ ctx[16], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*shouldShowPleaseWait, confirmTitle*/ 132) && t0_value !== (t0_value = (/*shouldShowPleaseWait*/ ctx[7]
    			? "Initializing resources"
    			: /*confirmTitle*/ ctx[2]) + "")) set_data_dev(t0, t0_value);

    			if ((!current || dirty & /*shouldShowPleaseWait, confirmText*/ 136) && raw_value !== (raw_value = (/*shouldShowPleaseWait*/ ctx[7]
    			? "Please wait a moment..."
    			: /*confirmText*/ ctx[3]) + "")) h21.innerHTML = raw_value;
    			if (!/*isAlert*/ ctx[1] && !/*shouldShowPleaseWait*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div1, t3);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (!current || dirty & /*confirmLabel*/ 16) set_data_dev(t4, /*confirmLabel*/ ctx[4]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (div2_outro) div2_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			div2_outro = create_out_transition(div2, fade, { duration: 200 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (if_block) if_block.d();
    			/*button_binding*/ ctx[14](null);
    			if (detaching && div2_outro) div2_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(76:0) {#if showConfirm}",
    		ctx
    	});

    	return block;
    }

    // (98:20) {#if !isAlert && !shouldShowPleaseWait}
    function create_if_block_1(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*cancelLabel*/ ctx[5]);
    			attr_dev(button, "class", "button svelte-iuqa3i");
    			add_location(button, file$1, 98, 24, 3276);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*handleCancel*/ ctx[9], false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler*/ ctx[13], false, false, false, false)
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
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(98:20) {#if !isAlert && !shouldShowPleaseWait}",
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
    	let shouldShowPleaseWait;
    	let $initData;
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(12, $initData = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Confirm', slots, []);
    	const dispatch = createEventDispatcher();
    	let { showConfirm = false } = $$props;
    	let { isAlert = false } = $$props;
    	let { confirmTitle = "Confirmation" } = $$props;
    	let { confirmText = "Do you want to continue?" } = $$props;
    	let { confirmLabel = "OK" } = $$props;
    	let { cancelLabel = "CANCEL" } = $$props;
    	let { isImportant = false } = $$props;
    	let confirmButtonEl;
    	let isRecentlyOpened = false, isRecentlyOpenedTimeout;

    	function isPleaseWaitAlert() {
    		return confirmTitle === "Initializing resources" && isAlert;
    	}

    	initData.subscribe(val => {
    		if (val === false && isPleaseWaitAlert()) {
    			$$invalidate(0, showConfirm = false);
    			dispatch("cancelled");
    		}
    	});

    	function handleConfirm(e) {
    		if (isRecentlyOpened && e.type !== "keydown") return;
    		$$invalidate(0, showConfirm = false);

    		if (shouldShowPleaseWait) {
    			dispatch("cancelled");
    		} else {
    			dispatch("confirmed");
    		}
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
    		$$invalidate(0, showConfirm = false);
    		dispatch("cancelled");
    	}

    	afterUpdate(() => {
    		if (showConfirm) {
    			isRecentlyOpened = true;

    			isRecentlyOpenedTimeout = setTimeout(
    				() => {
    					isRecentlyOpened = false;
    				},
    				200
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
    		'cancelLabel',
    		'isImportant'
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
    		if ('isImportant' in $$props) $$invalidate(11, isImportant = $$props.isImportant);
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		createEventDispatcher,
    		afterUpdate,
    		initData,
    		dispatch,
    		showConfirm,
    		isAlert,
    		confirmTitle,
    		confirmText,
    		confirmLabel,
    		cancelLabel,
    		isImportant,
    		confirmButtonEl,
    		isRecentlyOpened,
    		isRecentlyOpenedTimeout,
    		isPleaseWaitAlert,
    		handleConfirm,
    		handleCancel,
    		handleConfirmVisibility,
    		shouldShowPleaseWait,
    		$initData
    	});

    	$$self.$inject_state = $$props => {
    		if ('showConfirm' in $$props) $$invalidate(0, showConfirm = $$props.showConfirm);
    		if ('isAlert' in $$props) $$invalidate(1, isAlert = $$props.isAlert);
    		if ('confirmTitle' in $$props) $$invalidate(2, confirmTitle = $$props.confirmTitle);
    		if ('confirmText' in $$props) $$invalidate(3, confirmText = $$props.confirmText);
    		if ('confirmLabel' in $$props) $$invalidate(4, confirmLabel = $$props.confirmLabel);
    		if ('cancelLabel' in $$props) $$invalidate(5, cancelLabel = $$props.cancelLabel);
    		if ('isImportant' in $$props) $$invalidate(11, isImportant = $$props.isImportant);
    		if ('confirmButtonEl' in $$props) $$invalidate(6, confirmButtonEl = $$props.confirmButtonEl);
    		if ('isRecentlyOpened' in $$props) isRecentlyOpened = $$props.isRecentlyOpened;
    		if ('isRecentlyOpenedTimeout' in $$props) isRecentlyOpenedTimeout = $$props.isRecentlyOpenedTimeout;
    		if ('shouldShowPleaseWait' in $$props) $$invalidate(7, shouldShowPleaseWait = $$props.shouldShowPleaseWait);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$initData, isAlert, isImportant*/ 6146) {
    			$$invalidate(7, shouldShowPleaseWait = $initData && !isAlert && !isImportant);
    		}
    	};

    	return [
    		showConfirm,
    		isAlert,
    		confirmTitle,
    		confirmText,
    		confirmLabel,
    		cancelLabel,
    		confirmButtonEl,
    		shouldShowPleaseWait,
    		handleConfirm,
    		handleCancel,
    		handleConfirmVisibility,
    		isImportant,
    		$initData,
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
    			cancelLabel: 5,
    			isImportant: 11
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

    	get isImportant() {
    		throw new Error("<Confirm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isImportant(value) {
    		throw new Error("<Confirm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // Component
    // Anime

    var C = {
        Fixed: {
            CustomFilter: CustomFilter,
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

    const { Object: Object_1, console: console_1 } = globals;

    const file = "src\\App.svelte";

    // (1285:1) {#if _progress > 0 && _progress < 100}
    function create_if_block(ctx) {
    	let div;
    	let div_class_value;
    	let div_outro;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", "progress");

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("progress" + (/*isBelowNav*/ ctx[2]
    			? " is-below-absolute-progress"
    			: "")) + " svelte-dwpjqx"));

    			set_style(div, "--progress", "-" + (100 - /*_progress*/ ctx[9]) + "%");
    			add_location(div, file, 1285, 2, 34531);
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
    			if (!current || dirty[0] & /*isBelowNav*/ 4 && div_class_value !== (div_class_value = "" + (null_to_empty("progress" + (/*isBelowNav*/ ctx[2]
    			? " is-below-absolute-progress"
    			: "")) + " svelte-dwpjqx"))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty[0] & /*_progress*/ 512) {
    				set_style(div, "--progress", "-" + (100 - /*_progress*/ ctx[9]) + "%");
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
    		id: create_if_block.name,
    		type: "if",
    		source: "(1285:1) {#if _progress > 0 && _progress < 100}",
    		ctx
    	});

    	return block;
    }

    // (1301:2) <C.Others.Search>
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
    		source: "(1301:2) <C.Others.Search>",
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
    	let c_fixed_customfilter;
    	let t5;
    	let c_anime_fixed_animeoptionspopup;
    	let t6;
    	let c_others_confirm;
    	let main_class_value;
    	let current;
    	let if_block = /*_progress*/ ctx[9] > 0 && /*_progress*/ ctx[9] < 100 && create_if_block(ctx);
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
    	c_fixed_customfilter = new C.Fixed.CustomFilter({ $$inline: true });
    	c_anime_fixed_animeoptionspopup = new C.Anime.Fixed.AnimeOptionsPopup({ $$inline: true });

    	c_others_confirm = new C.Others.Confirm({
    			props: {
    				showConfirm: /*$confirmIsVisible*/ ctx[0],
    				isAlert: /*_isAlert*/ ctx[3],
    				confirmTitle: /*_confirmTitle*/ ctx[4],
    				confirmText: /*_confirmText*/ ctx[5],
    				confirmLabel: /*_confirmLabel*/ ctx[6],
    				cancelLabel: /*_cancelLabel*/ ctx[7],
    				isImportant: /*_isImportant*/ ctx[8]
    			},
    			$$inline: true
    		});

    	c_others_confirm.$on("confirmed", /*handleConfirmationConfirmed*/ ctx[12]);
    	c_others_confirm.$on("cancelled", /*handleConfirmationCancelled*/ ctx[13]);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (if_block) if_block.c();
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
    			create_component(c_fixed_customfilter.$$.fragment);
    			t5 = space();
    			create_component(c_anime_fixed_animeoptionspopup.$$.fragment);
    			t6 = space();
    			create_component(c_others_confirm.$$.fragment);
    			attr_dev(div, "class", "home svelte-dwpjqx");
    			attr_dev(div, "id", "home");
    			add_location(div, file, 1299, 1, 34879);
    			attr_dev(main, "id", "main");

    			attr_dev(main, "class", main_class_value = "" + (null_to_empty((/*$popupVisible*/ ctx[10] || /*$menuVisible*/ ctx[11]
    			? " full-screen-popup"
    			: "") + (/*$android*/ ctx[1] ? " android" : "")) + " svelte-dwpjqx"));

    			add_location(main, file, 1279, 0, 34362);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if (if_block) if_block.m(main, null);
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
    			mount_component(c_fixed_customfilter, main, null);
    			append_dev(main, t5);
    			mount_component(c_anime_fixed_animeoptionspopup, main, null);
    			append_dev(main, t6);
    			mount_component(c_others_confirm, main, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*_progress*/ ctx[9] > 0 && /*_progress*/ ctx[9] < 100) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*_progress*/ 512) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(main, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const c_others_search_changes = {};

    			if (dirty[2] & /*$$scope*/ 1024) {
    				c_others_search_changes.$$scope = { dirty, ctx };
    			}

    			c_others_search.$set(c_others_search_changes);
    			const c_others_confirm_changes = {};
    			if (dirty[0] & /*$confirmIsVisible*/ 1) c_others_confirm_changes.showConfirm = /*$confirmIsVisible*/ ctx[0];
    			if (dirty[0] & /*_isAlert*/ 8) c_others_confirm_changes.isAlert = /*_isAlert*/ ctx[3];
    			if (dirty[0] & /*_confirmTitle*/ 16) c_others_confirm_changes.confirmTitle = /*_confirmTitle*/ ctx[4];
    			if (dirty[0] & /*_confirmText*/ 32) c_others_confirm_changes.confirmText = /*_confirmText*/ ctx[5];
    			if (dirty[0] & /*_confirmLabel*/ 64) c_others_confirm_changes.confirmLabel = /*_confirmLabel*/ ctx[6];
    			if (dirty[0] & /*_cancelLabel*/ 128) c_others_confirm_changes.cancelLabel = /*_cancelLabel*/ ctx[7];
    			if (dirty[0] & /*_isImportant*/ 256) c_others_confirm_changes.isImportant = /*_isImportant*/ ctx[8];
    			c_others_confirm.$set(c_others_confirm_changes);

    			if (!current || dirty[0] & /*$popupVisible, $menuVisible, $android*/ 3074 && main_class_value !== (main_class_value = "" + (null_to_empty((/*$popupVisible*/ ctx[10] || /*$menuVisible*/ ctx[11]
    			? " full-screen-popup"
    			: "") + (/*$android*/ ctx[1] ? " android" : "")) + " svelte-dwpjqx"))) {
    				attr_dev(main, "class", main_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(c_fixed_navigator.$$.fragment, local);
    			transition_in(c_fixed_menu.$$.fragment, local);
    			transition_in(c_others_search.$$.fragment, local);
    			transition_in(c_anime_fixed_animepopup.$$.fragment, local);
    			transition_in(c_fixed_customfilter.$$.fragment, local);
    			transition_in(c_anime_fixed_animeoptionspopup.$$.fragment, local);
    			transition_in(c_others_confirm.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(c_fixed_navigator.$$.fragment, local);
    			transition_out(c_fixed_menu.$$.fragment, local);
    			transition_out(c_others_search.$$.fragment, local);
    			transition_out(c_anime_fixed_animepopup.$$.fragment, local);
    			transition_out(c_fixed_customfilter.$$.fragment, local);
    			transition_out(c_anime_fixed_animeoptionspopup.$$.fragment, local);
    			transition_out(c_others_confirm.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    			destroy_component(c_fixed_navigator);
    			destroy_component(c_fixed_menu);
    			destroy_component(c_others_search);
    			destroy_component(c_anime_fixed_animepopup);
    			destroy_component(c_fixed_customfilter);
    			destroy_component(c_anime_fixed_animeoptionspopup);
    			destroy_component(c_others_confirm);
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
    	let $gridFullView;
    	let $dropdownIsVisible;
    	let $isFullViewed;
    	let $confirmIsVisible;
    	let $animeOptionVisible;
    	let $android;
    	let $confirmPromise;
    	let $dataStatus;
    	let $hiddenEntries;
    	let $newFinalAnime;
    	let $finalAnimeList;
    	let $animeLoaderWorker;
    	let $listIsUpdating;
    	let $isScrolling;
    	let $shouldGoBack;
    	let $listUpdateAvailable;
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
    	let $runExport;
    	let $lastRunnedAutoExportDate;
    	let $lastRunnedAutoUpdateDate;
    	let $autoPlay;
    	let $filterOptions;
    	let $activeTagFilters;
    	let $selectedCustomFilter;
    	let $username;
    	let $exportPathIsAvailable;
    	let $appID;
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(32, $gridFullView = $$value));
    	validate_store(dropdownIsVisible, 'dropdownIsVisible');
    	component_subscribe($$self, dropdownIsVisible, $$value => $$invalidate(16, $dropdownIsVisible = $$value));
    	validate_store(isFullViewed, 'isFullViewed');
    	component_subscribe($$self, isFullViewed, $$value => $$invalidate(17, $isFullViewed = $$value));
    	validate_store(confirmIsVisible, 'confirmIsVisible');
    	component_subscribe($$self, confirmIsVisible, $$value => $$invalidate(0, $confirmIsVisible = $$value));
    	validate_store(animeOptionVisible, 'animeOptionVisible');
    	component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(18, $animeOptionVisible = $$value));
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(1, $android = $$value));
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(33, $confirmPromise = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(34, $dataStatus = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(35, $hiddenEntries = $$value));
    	validate_store(newFinalAnime, 'newFinalAnime');
    	component_subscribe($$self, newFinalAnime, $$value => $$invalidate(36, $newFinalAnime = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(37, $finalAnimeList = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(38, $animeLoaderWorker = $$value));
    	validate_store(listIsUpdating, 'listIsUpdating');
    	component_subscribe($$self, listIsUpdating, $$value => $$invalidate(39, $listIsUpdating = $$value));
    	validate_store(isScrolling, 'isScrolling');
    	component_subscribe($$self, isScrolling, $$value => $$invalidate(40, $isScrolling = $$value));
    	validate_store(shouldGoBack, 'shouldGoBack');
    	component_subscribe($$self, shouldGoBack, $$value => $$invalidate(41, $shouldGoBack = $$value));
    	validate_store(listUpdateAvailable, 'listUpdateAvailable');
    	component_subscribe($$self, listUpdateAvailable, $$value => $$invalidate(42, $listUpdateAvailable = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(10, $popupVisible = $$value));
    	validate_store(menuVisible, 'menuVisible');
    	component_subscribe($$self, menuVisible, $$value => $$invalidate(11, $menuVisible = $$value));
    	validate_store(userRequestIsRunning, 'userRequestIsRunning');
    	component_subscribe($$self, userRequestIsRunning, $$value => $$invalidate(43, $userRequestIsRunning = $$value));
    	validate_store(autoUpdateInterval, 'autoUpdateInterval');
    	component_subscribe($$self, autoUpdateInterval, $$value => $$invalidate(44, $autoUpdateInterval = $$value));
    	validate_store(autoExportInterval, 'autoExportInterval');
    	component_subscribe($$self, autoExportInterval, $$value => $$invalidate(45, $autoExportInterval = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(46, $initData = $$value));
    	validate_store(hasWheel, 'hasWheel');
    	component_subscribe($$self, hasWheel, $$value => $$invalidate(47, $hasWheel = $$value));
    	validate_store(autoUpdate, 'autoUpdate');
    	component_subscribe($$self, autoUpdate, $$value => $$invalidate(48, $autoUpdate = $$value));
    	validate_store(autoExport, 'autoExport');
    	component_subscribe($$self, autoExport, $$value => $$invalidate(49, $autoExport = $$value));
    	validate_store(scrollingTimeout, 'scrollingTimeout');
    	component_subscribe($$self, scrollingTimeout, $$value => $$invalidate(50, $scrollingTimeout = $$value));
    	validate_store(runExport, 'runExport');
    	component_subscribe($$self, runExport, $$value => $$invalidate(51, $runExport = $$value));
    	validate_store(lastRunnedAutoExportDate, 'lastRunnedAutoExportDate');
    	component_subscribe($$self, lastRunnedAutoExportDate, $$value => $$invalidate(52, $lastRunnedAutoExportDate = $$value));
    	validate_store(lastRunnedAutoUpdateDate, 'lastRunnedAutoUpdateDate');
    	component_subscribe($$self, lastRunnedAutoUpdateDate, $$value => $$invalidate(53, $lastRunnedAutoUpdateDate = $$value));
    	validate_store(autoPlay, 'autoPlay');
    	component_subscribe($$self, autoPlay, $$value => $$invalidate(54, $autoPlay = $$value));
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(55, $filterOptions = $$value));
    	validate_store(activeTagFilters, 'activeTagFilters');
    	component_subscribe($$self, activeTagFilters, $$value => $$invalidate(56, $activeTagFilters = $$value));
    	validate_store(selectedCustomFilter, 'selectedCustomFilter');
    	component_subscribe($$self, selectedCustomFilter, $$value => $$invalidate(57, $selectedCustomFilter = $$value));
    	validate_store(username, 'username');
    	component_subscribe($$self, username, $$value => $$invalidate(58, $username = $$value));
    	validate_store(exportPathIsAvailable, 'exportPathIsAvailable');
    	component_subscribe($$self, exportPathIsAvailable, $$value => $$invalidate(59, $exportPathIsAvailable = $$value));
    	validate_store(appID, 'appID');
    	component_subscribe($$self, appID, $$value => $$invalidate(60, $appID = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	set_store_value(android$1, $android = isAndroid(), $android); // Android/Browser Identifier
    	let windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth);
    	let windowHeight = Math.max(window.visualViewport.height, window.innerHeight);
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
    				set_store_value(dataStatus, $dataStatus = "Please Wait", $dataStatus);
    			}
    		},
    		200
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

    			set_store_value(gridFullView, $gridFullView = $gridFullView ?? getLocalStorage("gridFullView") ?? await retrieveJSON("gridFullView"), $gridFullView);

    			if ($gridFullView == null) {
    				set_store_value(gridFullView, $gridFullView = false, $gridFullView);

    				setLocalStorage("gridFullView", $gridFullView).catch(() => {
    					saveJSON($gridFullView, "gridFullView");
    					removeLocalStorage("gridFullView");
    				});
    			}

    			await animeLoader$1({ loadInit: true }).then(async data => {
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);

    				if (data?.isNew) {
    					if ($finalAnimeList instanceof Array) {
    						set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    					}

    					data?.finalAnimeList?.forEach?.((anime, idx) => {
    						set_store_value(
    							newFinalAnime,
    							$newFinalAnime = {
    								id: anime.id,
    								idx: data.shownAnimeListCount + idx,
    								finalAnimeList: anime
    							},
    							$newFinalAnime
    						);
    					});
    				}

    				resolve();
    			}).catch(async () => {
    				await saveJSON(true, "shouldLoadAnime");
    				resolve();
    			});
    		}).then(() => {
    		// Get Export Folder for Android
    		(async () => {
    			if ($android) {
    				set_store_value(exportPathIsAvailable, $exportPathIsAvailable = $exportPathIsAvailable ?? getLocalStorage("exportPathIsAvailable") ?? await retrieveJSON("exportPathIsAvailable"), $exportPathIsAvailable);

    				if ($exportPathIsAvailable == null) {
    					set_store_value(exportPathIsAvailable, $exportPathIsAvailable = false, $exportPathIsAvailable);

    					setLocalStorage("exportPathIsAvailable", $exportPathIsAvailable).catch(() => {
    						saveJSON($exportPathIsAvailable, "exportPathIsAvailable");
    						removeLocalStorage("exportPathIsAvailable");
    					});
    				}
    			}
    		})();

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
    					if (navigator.onLine) {
    						set_store_value(userRequestIsRunning, $userRequestIsRunning = true, $userRequestIsRunning);

    						requestUserEntries().then(() => {
    							set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);
    							requestAnimeEntries();
    						}).catch(error => {
    							set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);
    							set_store_value(dataStatus, $dataStatus = "Something went wrong", $dataStatus);
    							console.error(error);
    						});
    					}

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
    				// 									"Something went wrong";
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
    					setLocalStorage("username", _username).catch(() => {
    						removeLocalStorage("username");
    					});

    					set_store_value(username, $username = _username, $username);
    				}

    				resolve();
    			})); // }

    		// Check/Get/Update Filter Options Selection
    		initDataPromises.push(new Promise(async (resolve, reject) => {
    				getFilterOptions().then(data => {
    					set_store_value(selectedCustomFilter, $selectedCustomFilter = data.selectedCustomFilter, $selectedCustomFilter);
    					set_store_value(activeTagFilters, $activeTagFilters = data.activeTagFilters, $activeTagFilters);
    					set_store_value(filterOptions, $filterOptions = data.filterOptions, $filterOptions);
    					resolve();
    				}).catch(() => {
    					reject();
    				});
    			}));

    		Promise.all(initDataPromises).then(async () => {
    			set_store_value(initData, $initData = false, $initData);

    			(async () => {
    				if (!isJsonObject($hiddenEntries)) {
    					set_store_value(hiddenEntries, $hiddenEntries = await retrieveJSON("hiddenEntries"), $hiddenEntries);
    				}

    				set_store_value(autoPlay, $autoPlay = $autoPlay ?? await retrieveJSON("autoPlay"), $autoPlay);

    				if ($autoPlay == null) {
    					set_store_value(autoPlay, $autoPlay = false, $autoPlay);

    					setLocalStorage("autoPlay", $autoPlay).catch(() => {
    						saveJSON($autoPlay, "autoPlay");
    						removeLocalStorage("autoPlay");
    					});
    				}

    				set_store_value(autoUpdate, $autoUpdate = $autoUpdate ?? await retrieveJSON("autoUpdate"), $autoUpdate);

    				if (!$autoUpdate) {
    					set_store_value(autoUpdate, $autoUpdate = false, $autoUpdate);

    					setLocalStorage("autoUpdate", $autoUpdate).catch(() => {
    						saveJSON($autoUpdate, "autoUpdate");
    						removeLocalStorage("autoUpdate");
    					});
    				}

    				set_store_value(autoExport, $autoExport = $autoExport ?? await retrieveJSON("autoExport"), $autoExport);

    				if ($autoExport == null) {
    					set_store_value(autoExport, $autoExport = false, $autoExport);

    					setLocalStorage("autoExport", $autoExport).catch(() => {
    						saveJSON($autoExport, "autoExport");
    						removeLocalStorage("autoExport");
    					});
    				}
    			})();

    			// Get/Show List
    			let shouldProcessRecommendation = await retrieveJSON("shouldProcessRecommendation");

    			if (shouldProcessRecommendation === undefined) {
    				let recommendedAnimeListLen = await retrieveJSON("recommendedAnimeListLength");

    				if (recommendedAnimeListLen < 1) {
    					shouldProcessRecommendation = true;
    				}
    			}

    			new Promise(async resolve => {
    					if (shouldProcessRecommendation) {
    						processRecommendedAnimeList().then(async () => {
    							resolve(false);
    						}).catch(initFailed);
    					} else {
    						resolve(true);
    					}
    				}).then(async shouldLoadAnime => {
    				if (!shouldLoadAnime) {
    					shouldLoadAnime = await retrieveJSON("shouldLoadAnime");

    					if (shouldLoadAnime === undefined) {
    						let finalAnimeListLen = await retrieveJSON("finalAnimeListLength");

    						if (finalAnimeListLen < 1) {
    							shouldLoadAnime = true;
    						}
    					}
    				}

    				if (shouldLoadAnime) {
    					animeLoader$1().then(async data => {
    						set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);

    						if (data?.isNew) {
    							if ($finalAnimeList instanceof Array) {
    								set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    							}

    							data?.finalAnimeList?.forEach?.((anime, idx) => {
    								set_store_value(
    									newFinalAnime,
    									$newFinalAnime = {
    										id: anime.id,
    										idx: data.shownAnimeListCount + idx,
    										finalAnimeList: anime
    									},
    									$newFinalAnime
    								);
    							});

    							set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries || $hiddenEntries, $hiddenEntries);
    							set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    							checkAutoFunctions(true);
    						}

    						return;
    					}).catch(initFailed);
    				} else {
    					set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    					checkAutoFunctions(true);
    				}
    			});
    		}).catch(initFailed);
    	});

    	async function initFailed() {
    		checkAutoFunctions(true);
    		set_store_value(dataStatus, $dataStatus = "Something went wrong", $dataStatus);

    		if ($android) {
    			$confirmPromise?.({
    				isAlert: true,
    				title: "Something went wrong",
    				text: "App may not be working properly, you may want to restart and make sure you're running the latest version."
    			});
    		} else {
    			$confirmPromise?.({
    				isAlert: true,
    				title: "Something went wrong",
    				text: "App may not be working properly, you may want to refresh the page, or if not clear your cookies but backup your data first."
    			});
    		}

    		set_store_value(initData, $initData = false, $initData);
    		console.error(error);
    	}

    	// function getAnilistAccessTokenFromURL() {
    	// 	let urlParams = new URLSearchParams(window.location.hash.slice(1));
    	// 	return urlParams.get("access_token");
    	// }
    	async function checkAutoFunctions(initCheck = false) {
    		// auto Update
    		if (initCheck) {
    			set_store_value(lastRunnedAutoUpdateDate, $lastRunnedAutoUpdateDate = await retrieveJSON("lastRunnedAutoUpdateDate"), $lastRunnedAutoUpdateDate);
    			set_store_value(lastRunnedAutoExportDate, $lastRunnedAutoExportDate = await retrieveJSON("lastRunnedAutoExportDate"), $lastRunnedAutoExportDate);
    			set_store_value(userRequestIsRunning, $userRequestIsRunning = true, $userRequestIsRunning);

    			requestUserEntries().then(() => {
    				set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);

    				requestAnimeEntries().finally(() => {
    					checkAutoExportOnLoad();
    				});
    			}).catch(error => {
    				checkAutoExportOnLoad();
    				set_store_value(userRequestIsRunning, $userRequestIsRunning = false, $userRequestIsRunning);
    				set_store_value(dataStatus, $dataStatus = "Something went wrong", $dataStatus);
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
    					set_store_value(dataStatus, $dataStatus = "Something went wrong", $dataStatus);
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
    			getExtraInfo();
    		}
    	});

    	// Reactive Functions
    	importantLoad.subscribe(async val => {
    		if (typeof val !== "boolean" || $initData) return;
    		set_store_value(listUpdateAvailable, $listUpdateAvailable = false, $listUpdateAvailable);

    		if ($animeLoaderWorker) {
    			$animeLoaderWorker.terminate();
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    		}

    		animeLoader$1().then(async data => {
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);

    			if (data?.isNew) {
    				if ($finalAnimeList instanceof Array) {
    					set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    				}

    				data?.finalAnimeList?.forEach?.((anime, idx) => {
    					set_store_value(
    						newFinalAnime,
    						$newFinalAnime = {
    							id: anime.id,
    							idx: data.shownAnimeListCount + idx,
    							finalAnimeList: anime
    						},
    						$newFinalAnime
    					);
    				});

    				set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries || $hiddenEntries, $hiddenEntries);
    			}

    			set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    			return;
    		}).catch(error => {
    			console.error(error);
    		});
    	});

    	importantUpdate.subscribe(async val => {
    		if (typeof val !== "boolean" || $initData) return;
    		await saveJSON(true, "shouldProcessRecommendation");
    		set_store_value(listUpdateAvailable, $listUpdateAvailable = false, $listUpdateAvailable);

    		processRecommendedAnimeList().then(async () => {
    			updateFilters.update(e => !e);
    			importantLoad.update(e => !e);
    		}).catch(error => {
    			importantLoad.update(e => !e);
    			console.error(error);
    		});
    	});

    	updateRecommendationList.subscribe(async val => {
    		if (typeof val !== "boolean" || $initData) return;
    		await saveJSON(true, "shouldProcessRecommendation");

    		processRecommendedAnimeList().then(async () => {
    			updateFilters.update(e => !e);
    			loadAnime.update(e => !e);
    		}).catch(error => {
    			loadAnime.update(e => !e);
    			console.error(error);
    		});
    	});

    	loadAnime.subscribe(async val => {
    		if (typeof val !== "boolean" || $initData) return;

    		if (($popupVisible || ($gridFullView
    		? animeGridEl.scrollLeft > 500
    		: animeGridEl?.getBoundingClientRect?.()?.top < 0)) && $finalAnimeList?.length) {
    			await saveJSON(true, "shouldLoadAnime");
    			set_store_value(listUpdateAvailable, $listUpdateAvailable = true, $listUpdateAvailable);
    		} else {
    			if ($animeLoaderWorker) {
    				$animeLoaderWorker.terminate();
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    			}

    			animeLoader$1().then(async data => {
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);

    				if (data?.isNew) {
    					if ($finalAnimeList instanceof Array) {
    						set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    					}

    					data?.finalAnimeList?.forEach?.((anime, idx) => {
    						set_store_value(
    							newFinalAnime,
    							$newFinalAnime = {
    								id: anime.id,
    								idx: data.shownAnimeListCount + idx,
    								finalAnimeList: anime
    							},
    							$newFinalAnime
    						);
    					});

    					set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries || $hiddenEntries, $hiddenEntries);
    				}

    				set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    				return;
    			}).catch(error => {
    				console.error(error);
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
    					Math.min(timeLeft, 2000000000)
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
    			set_store_value(dataStatus, $dataStatus = "Something went wrong", $dataStatus);
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
    					Math.min(timeLeft, 2000000000)
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

    	window.runExport = () => {
    		set_store_value(runExport, $runExport = !$runExport, $runExport);
    	};

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

    	listUpdateAvailable.subscribe(val => {
    		if (!val) {
    			set_store_value(listIsUpdating, $listIsUpdating = false, $listIsUpdating);
    		}
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

    			if ($confirmIsVisible) {
    				handleConfirmationCancelled();
    				set_store_value(confirmIsVisible, $confirmIsVisible = false, $confirmIsVisible);
    				willExit = false;
    				return;
    			} else if (usernameInputEl && usernameInputEl === document?.activeElement && Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.innerWidth) <= 750) {
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
    			} else if ($dropdownIsVisible) {
    				set_store_value(dropdownIsVisible, $dropdownIsVisible = false, $dropdownIsVisible);
    				willExit = false;
    				return;
    			} else if (!willExit) {
    				willExit = true;

    				if ($gridFullView) {
    					animeGridEl.style.overflow = "hidden";
    					animeGridEl.style.overflow = "";
    					animeGridEl.scroll({ left: 0, behavior: "smooth" });
    				} else {
    					window.showCustomFilter?.();

    					if ($android || !matchMedia("(hover:hover)").matches) {
    						document.documentElement.style.overflow = "hidden";
    						document.documentElement.style.overflow = "";
    					}

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
    					window.showCustomFilter?.();

    					if ($android || !matchMedia("(hover:hover)").matches) {
    						document.documentElement.style.overflow = "hidden";
    					}

    					document.documentElement.scrollTop = 0;
    					document.body.scrollTop = 0;
    					window.scrollY = 0;

    					if ($android || !matchMedia("(hover:hover)").matches) {
    						clearTimeout(exitScrollTimeout);

    						exitScrollTimeout = setTimeout(
    							() => {
    								document.documentElement.style.overflow = "";
    							},
    							100
    						);
    					}
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
    			if (animeGridEl?.getBoundingClientRect?.()?.top < 0) {
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

    	let isBelowNav = false;
    	let updateIconIsManual = false;

    	window.addEventListener(
    		"scroll",
    		() => {
    			let shouldUpdate = animeGridEl?.getBoundingClientRect?.()?.top > 0 && !$popupVisible;

    			if ($listUpdateAvailable && shouldUpdate) {
    				updateList();
    			}

    			$$invalidate(2, isBelowNav = document.documentElement.scrollTop > 47);
    			if (animeGridEl?.getBoundingClientRect?.()?.top < 0 && !willExit) window.setShouldGoBack(false);
    			runIsScrolling.update(e => !e);
    		},
    		{ passive: true }
    	);

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

    						let text2 = target.getAttribute("copy-value-2");

    						if (text2 && !ncsCompare(text2, text)) {
    							if ($android) {
    								window.copyToClipBoard(text2);
    								window.copyToClipBoard(text);
    							} else {
    								window.copyToClipBoard(text2);

    								setTimeout(
    									() => {
    										window.copyToClipBoard(text);
    									},
    									300
    								);
    							}
    						} else {
    							window.copyToClipBoard(text);
    						}
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

    	let _isAlert,
    		_confirmTitle,
    		_confirmText,
    		_confirmLabel,
    		_cancelLabel,
    		_isImportant;

    	let _confirmModalPromise;

    	set_store_value(
    		confirmPromise,
    		$confirmPromise = window.confirmPromise = async confirmValues => {
    			return new Promise(resolve => {
    					$$invalidate(3, _isAlert = confirmValues?.isAlert || false);
    					$$invalidate(4, _confirmTitle = confirmValues?.title || (_isAlert ? "Heads Up" : "Confirmation"));

    					$$invalidate(5, _confirmText = (typeof confirmValues === "string"
    					? confirmValues
    					: confirmValues?.text) || "Do you want to continue?");

    					$$invalidate(6, _confirmLabel = confirmValues?.confirmLabel || "OK");
    					$$invalidate(7, _cancelLabel = confirmValues?.cancelLabel || "CANCEL");
    					$$invalidate(8, _isImportant = confirmValues?.isImportant ?? false);
    					set_store_value(confirmIsVisible, $confirmIsVisible = true, $confirmIsVisible);
    					_confirmModalPromise = { resolve };
    				});
    		},
    		$confirmPromise
    	);

    	function handleConfirmationConfirmed() {
    		_confirmModalPromise?.resolve?.(true);
    		_confirmModalPromise = $$invalidate(3, _isAlert = $$invalidate(4, _confirmTitle = $$invalidate(5, _confirmText = $$invalidate(6, _confirmLabel = $$invalidate(7, _cancelLabel = $$invalidate(8, _isImportant = undefined))))));
    		set_store_value(confirmIsVisible, $confirmIsVisible = false, $confirmIsVisible);
    	}

    	function handleConfirmationCancelled() {
    		_confirmModalPromise?.resolve?.(false);
    		_confirmModalPromise = $$invalidate(3, _isAlert = $$invalidate(4, _confirmTitle = $$invalidate(5, _confirmText = $$invalidate(6, _confirmLabel = $$invalidate(7, _cancelLabel = $$invalidate(8, _isImportant = undefined))))));
    		set_store_value(confirmIsVisible, $confirmIsVisible = false, $confirmIsVisible);
    	}

    	confirmIsVisible.subscribe(val => {
    		if (val === false) {
    			_confirmModalPromise?.resolve?.(false);
    			_confirmModalPromise = $$invalidate(3, _isAlert = $$invalidate(4, _confirmTitle = $$invalidate(5, _confirmText = $$invalidate(6, _confirmLabel = $$invalidate(7, _cancelLabel = $$invalidate(8, _isImportant = undefined))))));
    		}
    	});

    	async function updateList() {
    		set_store_value(listIsUpdating, $listIsUpdating = true, $listIsUpdating);

    		if ($animeLoaderWorker) {
    			$animeLoaderWorker.terminate();
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    		}

    		animeLoader$1().then(async data => {
    			set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);

    			if (data?.isNew) {
    				if ($finalAnimeList instanceof Array) {
    					set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList?.slice?.(0, Math.min(window.getLastShownFinalAnimeLength() || 0, data.finalAnimeListCount)), $finalAnimeList);
    				}

    				data?.finalAnimeList?.forEach?.((anime, idx) => {
    					set_store_value(
    						newFinalAnime,
    						$newFinalAnime = {
    							id: anime.id,
    							idx: data.shownAnimeListCount + idx,
    							finalAnimeList: anime
    						},
    						$newFinalAnime
    					);
    				});

    				set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries || $hiddenEntries, $hiddenEntries);
    			}

    			set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    			return;
    		}).catch(error => {
    			console.error(error);
    		});
    	}

    	window.updateAppAlert = async () => {
    		if (await $confirmPromise?.({
    			title: "New updates are available",
    			text: "You may want to download the new version.",
    			confirmLabel: "DOWNLOAD",
    			isImportant: true
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
    				if (_progress < 100 && _progress > 0) {
    					$$invalidate(9, _progress = Math.max(val, _progress));
    				} else {
    					$$invalidate(9, _progress = val);
    				}
    			});

    			progressChangeStart = performance.now();
    		}
    	});

    	let changeStatusBarColorTimeout;

    	onMount(() => {
    		usernameInputEl = document.getElementById("usernameInput");
    		animeGridEl = document.getElementById("anime-grid");

    		animeGridEl?.addEventListener(
    			"scroll",
    			() => {
    				updateIconIsManual = animeGridEl?.getBoundingClientRect?.()?.top < 0;
    				if (animeGridEl.scrollLeft > 500 && !willExit) window.setShouldGoBack(false);
    				if (!$gridFullView) return;
    				runIsScrolling.update(e => !e);
    			},
    			{ passive: true }
    		);

    		document.getElementById("popup-container").addEventListener(
    			"scroll",
    			() => {
    				runIsScrolling.update(e => !e);
    			},
    			{ passive: true }
    		);

    		$$invalidate(14, windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth));
    		windowHeight = Math.max(window.visualViewport.height, window.innerHeight);

    		window.addEventListener("resize", () => {
    			windowHeight = Math.max(window.visualViewport.height, window.innerHeight);
    			$$invalidate(14, windowWidth = Math.max(document?.documentElement?.getBoundingClientRect?.()?.width, window.visualViewport.width, window.innerWidth));

    			if (windowWidth > 750) {
    				Object.assign(document?.getElementById?.("progress")?.style || {}, { display: "", zIndex: "" });
    			}
    		});
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		getWebVersion,
    		C,
    		onMount,
    		tick,
    		fade,
    		inject,
    		retrieveJSON,
    		saveJSON,
    		appID,
    		android: android$1,
    		username,
    		hiddenEntries,
    		filterOptions,
    		selectedCustomFilter,
    		activeTagFilters,
    		finalAnimeList,
    		animeLoaderWorker: animeLoaderWorker$1,
    		initData,
    		gridFullView,
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
    		listIsUpdating,
    		isFullViewed,
    		confirmIsVisible,
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
    		progress,
    		popupIsGoingBack,
    		dropdownIsVisible,
    		newFinalAnime,
    		getAnimeEntries,
    		getFilterOptions,
    		requestAnimeEntries,
    		requestUserEntries,
    		processRecommendedAnimeList,
    		animeLoader: animeLoader$1,
    		exportUserData,
    		getExtraInfo,
    		getLocalStorage,
    		isAndroid,
    		isJsonObject,
    		ncsCompare,
    		removeLocalStorage,
    		setLocalStorage,
    		windowWidth,
    		windowHeight,
    		usernameInputEl,
    		animeGridEl,
    		onYouTubeIframeAPIReady,
    		initDataPromises,
    		pleaseWaitStatusInterval,
    		initFailed,
    		checkAutoFunctions,
    		checkAutoExportOnLoad,
    		hourINMS,
    		autoUpdateIsPastDate,
    		autoExportIsPastDate,
    		windowWheel,
    		willExit,
    		exitScrollTimeout,
    		isBelowNav,
    		updateIconIsManual,
    		isChangingPopupVisible,
    		isChangingPopupVisibleTimeout,
    		copytimeoutId,
    		copyhold,
    		_isAlert,
    		_confirmTitle,
    		_confirmText,
    		_confirmLabel,
    		_cancelLabel,
    		_isImportant,
    		_confirmModalPromise,
    		handleConfirmationConfirmed,
    		handleConfirmationCancelled,
    		updateList,
    		_progress,
    		progressFrame,
    		progressChangeStart,
    		changeStatusBarColorTimeout,
    		$gridFullView,
    		$dropdownIsVisible,
    		$isFullViewed,
    		$confirmIsVisible,
    		$animeOptionVisible,
    		$android,
    		$confirmPromise,
    		$dataStatus,
    		$hiddenEntries,
    		$newFinalAnime,
    		$finalAnimeList,
    		$animeLoaderWorker,
    		$listIsUpdating,
    		$isScrolling,
    		$shouldGoBack,
    		$listUpdateAvailable,
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
    		$runExport,
    		$lastRunnedAutoExportDate,
    		$lastRunnedAutoUpdateDate,
    		$autoPlay,
    		$filterOptions,
    		$activeTagFilters,
    		$selectedCustomFilter,
    		$username,
    		$exportPathIsAvailable,
    		$appID
    	});

    	$$self.$inject_state = $$props => {
    		if ('windowWidth' in $$props) $$invalidate(14, windowWidth = $$props.windowWidth);
    		if ('windowHeight' in $$props) windowHeight = $$props.windowHeight;
    		if ('usernameInputEl' in $$props) usernameInputEl = $$props.usernameInputEl;
    		if ('animeGridEl' in $$props) animeGridEl = $$props.animeGridEl;
    		if ('initDataPromises' in $$props) initDataPromises = $$props.initDataPromises;
    		if ('pleaseWaitStatusInterval' in $$props) pleaseWaitStatusInterval = $$props.pleaseWaitStatusInterval;
    		if ('hourINMS' in $$props) hourINMS = $$props.hourINMS;
    		if ('windowWheel' in $$props) windowWheel = $$props.windowWheel;
    		if ('willExit' in $$props) willExit = $$props.willExit;
    		if ('exitScrollTimeout' in $$props) exitScrollTimeout = $$props.exitScrollTimeout;
    		if ('isBelowNav' in $$props) $$invalidate(2, isBelowNav = $$props.isBelowNav);
    		if ('updateIconIsManual' in $$props) updateIconIsManual = $$props.updateIconIsManual;
    		if ('isChangingPopupVisible' in $$props) isChangingPopupVisible = $$props.isChangingPopupVisible;
    		if ('isChangingPopupVisibleTimeout' in $$props) isChangingPopupVisibleTimeout = $$props.isChangingPopupVisibleTimeout;
    		if ('copytimeoutId' in $$props) copytimeoutId = $$props.copytimeoutId;
    		if ('copyhold' in $$props) copyhold = $$props.copyhold;
    		if ('_isAlert' in $$props) $$invalidate(3, _isAlert = $$props._isAlert);
    		if ('_confirmTitle' in $$props) $$invalidate(4, _confirmTitle = $$props._confirmTitle);
    		if ('_confirmText' in $$props) $$invalidate(5, _confirmText = $$props._confirmText);
    		if ('_confirmLabel' in $$props) $$invalidate(6, _confirmLabel = $$props._confirmLabel);
    		if ('_cancelLabel' in $$props) $$invalidate(7, _cancelLabel = $$props._cancelLabel);
    		if ('_isImportant' in $$props) $$invalidate(8, _isImportant = $$props._isImportant);
    		if ('_confirmModalPromise' in $$props) _confirmModalPromise = $$props._confirmModalPromise;
    		if ('_progress' in $$props) $$invalidate(9, _progress = $$props._progress);
    		if ('progressFrame' in $$props) progressFrame = $$props.progressFrame;
    		if ('progressChangeStart' in $$props) progressChangeStart = $$props.progressChangeStart;
    		if ('changeStatusBarColorTimeout' in $$props) $$invalidate(15, changeStatusBarColorTimeout = $$props.changeStatusBarColorTimeout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*$android, $animeOptionVisible, $confirmIsVisible, $isFullViewed, $dropdownIsVisible, windowWidth, changeStatusBarColorTimeout*/ 507907) {
    			{
    				if ($android) {
    					try {
    						let isOverlay = $animeOptionVisible || $confirmIsVisible || $isFullViewed || $dropdownIsVisible && windowWidth <= 750;
    						clearTimeout(changeStatusBarColorTimeout);

    						if (isOverlay) {
    							JSBridge.changeStatusBarColor(true);
    						} else {
    							$$invalidate(15, changeStatusBarColorTimeout = setTimeout(
    								() => {
    									JSBridge.changeStatusBarColor(false);
    								},
    								200
    							));
    						}
    					} catch(e) {
    						
    					}
    				}
    			}
    		}
    	};

    	return [
    		$confirmIsVisible,
    		$android,
    		isBelowNav,
    		_isAlert,
    		_confirmTitle,
    		_confirmText,
    		_confirmLabel,
    		_cancelLabel,
    		_isImportant,
    		_progress,
    		$popupVisible,
    		$menuVisible,
    		handleConfirmationConfirmed,
    		handleConfirmationCancelled,
    		windowWidth,
    		changeStatusBarColorTimeout,
    		$dropdownIsVisible,
    		$isFullViewed,
    		$animeOptionVisible
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

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
