
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

    const version$1 = 174;
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

    function getMostVisibleElement(parent, childSelector, intersectionRatioThreshold = 0.5) {
      try {
        var childElements;
        if (childSelector instanceof Array) {
          childElements = childSelector;
        } else {
          childElements = parent.querySelectorAll(childSelector);
        }
        var mostVisibleElement = null;
        var highestVisibleRatio = 0;
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
        var parentRect = parent.getBoundingClientRect();
        twoElements.forEach((childElement) => {
          var childRect = childElement.getBoundingClientRect();
          var intersectionHeight = Math.min(childRect.bottom, parentRect.bottom) - Math.max(childRect.top, parentRect.top);
          var intersectionRatio = intersectionHeight / childRect.height;
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
    const android$1 = writable(null);
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

    const mostRecentAiringDateTimeout = writable(null);
    const earlisetReleaseDate = writable(null);
    const checkAnimeLoaderStatus = writable(false);
    const animeObserver = writable(null);
    const animeIdxRemoved = writable(null);
    const shownAllInList = writable(false);
    const searchedAnimeKeyword = writable("");
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

    const { console: console_1$2 } = globals;
    const file$7 = "src\\components\\Anime\\AnimeGrid.svelte";

    function get_each_context_3$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[54] = list[i];
    	return child_ctx;
    }

    function get_each_context_4$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[54] = list[i];
    	return child_ctx;
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[54] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[54] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[59] = list[i];
    	child_ctx[60] = list;
    	child_ctx[61] = i;
    	return child_ctx;
    }

    // (552:8) {:else}
    function create_else_block_2$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "No Results";
    			attr_dev(div, "class", "empty svelte-xo6vxz");
    			add_location(div, file$7, 552, 12, 23149);
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
    		id: create_else_block_2$2.name,
    		type: "else",
    		source: "(552:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (543:48) 
    function create_if_block_5$2(ctx) {
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
    		id: create_if_block_5$2.name,
    		type: "if",
    		source: "(543:48) ",
    		ctx
    	});

    	return block;
    }

    // (426:8) {#if $finalAnimeList?.length}
    function create_if_block_1$6(ctx) {
    	let each_blocks_2 = [];
    	let each0_lookup = new Map();
    	let t0;
    	let t1;
    	let each2_anchor;
    	let each_value_2 = /*$finalAnimeList*/ ctx[12] || [];
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*anime*/ ctx[59]?.id || {};
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

    	let each_value = Array(/*isFullViewed*/ ctx[3]
    	? Math.floor((/*windowHeight*/ ctx[5] ?? 1100) / 220)
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
    			if (dirty[0] & /*$finalAnimeList, $popupVisible, handleOpenPopup, handleOpenOption, cancelOpenOption, $filterOptions, $earlisetReleaseDate, numberOfLoadedGrid*/ 1029120) {
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

    			if (dirty[0] & /*isFullViewed, windowHeight*/ 40) {
    				each_value = Array(/*isFullViewed*/ ctx[3]
    				? Math.floor((/*windowHeight*/ ctx[5] ?? 1100) / 220)
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
    		id: create_if_block_1$6.name,
    		type: "if",
    		source: "(426:8) {#if $finalAnimeList?.length}",
    		ctx
    	});

    	return block;
    }

    // (544:12) {#each Array(21) as _}
    function create_each_block_4$1(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "shimmer svelte-xo6vxz");
    			add_location(div0, file$7, 545, 20, 22944);
    			attr_dev(div1, "class", "image-grid__card skeleton svelte-xo6vxz");
    			add_location(div1, file$7, 544, 16, 22883);
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
    		source: "(544:12) {#each Array(21) as _}",
    		ctx
    	});

    	return block;
    }

    // (549:12) {#each Array(5) as _}
    function create_each_block_3$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "image-grid__card svelte-xo6vxz");
    			add_location(div, file$7, 549, 16, 23065);
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
    		source: "(549:12) {#each Array(5) as _}",
    		ctx
    	});

    	return block;
    }

    // (444:24) {#if anime?.coverImageUrl || anime?.bannerImageUrl || anime?.trailerThumbnailUrl}
    function create_if_block_4$3(ctx) {
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

    			attr_dev(img, "fetchpriority", img_fetchpriority_value = /*animeIdx*/ ctx[61] > /*numberOfLoadedGrid*/ ctx[16]
    			? ""
    			: "high");

    			attr_dev(img, "loading", img_loading_value = /*animeIdx*/ ctx[61] > /*numberOfLoadedGrid*/ ctx[16]
    			? "lazy"
    			: "eager");

    			attr_dev(img, "class", "" + (null_to_empty("image-grid__card-thumb  fade-out") + " svelte-xo6vxz"));
    			attr_dev(img, "alt", img_alt_value = (/*anime*/ ctx[59]?.shownTitle || "") + " Cover");
    			attr_dev(img, "width", "180px");
    			attr_dev(img, "height", "254.531px");
    			add_location(img, file$7, 444, 28, 17228);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(addImage_action = /*addImage*/ ctx[21].call(null, img, /*anime*/ ctx[59]?.coverImageUrl || /*anime*/ ctx[59]?.bannerImageUrl || /*anime*/ ctx[59]?.trailerThumbnailUrl || emptyImage$1)),
    					listen_dev(img, "load", /*load_handler*/ ctx[26], false, false, false, false),
    					listen_dev(img, "error", /*error_handler*/ ctx[27], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && img_fetchpriority_value !== (img_fetchpriority_value = /*animeIdx*/ ctx[61] > /*numberOfLoadedGrid*/ ctx[16]
    			? ""
    			: "high")) {
    				attr_dev(img, "fetchpriority", img_fetchpriority_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && img_loading_value !== (img_loading_value = /*animeIdx*/ ctx[61] > /*numberOfLoadedGrid*/ ctx[16]
    			? "lazy"
    			: "eager")) {
    				attr_dev(img, "loading", img_loading_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && img_alt_value !== (img_alt_value = (/*anime*/ ctx[59]?.shownTitle || "") + " Cover")) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (addImage_action && is_function(addImage_action.update) && dirty[0] & /*$finalAnimeList*/ 4096) addImage_action.update.call(null, /*anime*/ ctx[59]?.coverImageUrl || /*anime*/ ctx[59]?.bannerImageUrl || /*anime*/ ctx[59]?.trailerThumbnailUrl || emptyImage$1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$3.name,
    		type: "if",
    		source: "(444:24) {#if anime?.coverImageUrl || anime?.bannerImageUrl || anime?.trailerThumbnailUrl}",
    		ctx
    	});

    	return block;
    }

    // (503:40) {:else}
    function create_else_block_1$2(ctx) {
    	let t_value = `${/*anime*/ ctx[59].format || "N/A"}${/*anime*/ ctx[59].episodes
	? "(" + /*anime*/ ctx[59].episodes + ")"
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
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t_value !== (t_value = `${/*anime*/ ctx[59].format || "N/A"}${/*anime*/ ctx[59].episodes
			? "(" + /*anime*/ ctx[59].episodes + ")"
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
    		source: "(503:40) {:else}",
    		ctx
    	});

    	return block;
    }

    // (495:40) {#if isJsonObject(anime?.nextAiringEpisode)}
    function create_if_block_3$3(ctx) {
    	let t0_value = `${/*anime*/ ctx[59].format || "N/A"}` + "";
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
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t0_value !== (t0_value = `${/*anime*/ ctx[59].format || "N/A"}` + "")) set_data_dev(t0, t0_value);

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
    		id: create_if_block_3$3.name,
    		type: "if",
    		source: "(495:40) {#if isJsonObject(anime?.nextAiringEpisode)}",
    		ctx
    	});

    	return block;
    }

    // (497:44) {#key $earlisetReleaseDate || 1}
    function create_key_block$1(ctx) {
    	let t_value = getFinishedEpisode(/*anime*/ ctx[59].episodes, /*anime*/ ctx[59].nextAiringEpisode) + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t_value !== (t_value = getFinishedEpisode(/*anime*/ ctx[59].episodes, /*anime*/ ctx[59].nextAiringEpisode) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block$1.name,
    		type: "key",
    		source: "(497:44) {#key $earlisetReleaseDate || 1}",
    		ctx
    	});

    	return block;
    }

    // (524:40) {:else}
    function create_else_block$2(ctx) {
    	let t_value = (/*anime*/ ctx[59]?.formattedWeightedScore || "N/A") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t_value !== (t_value = (/*anime*/ ctx[59]?.formattedWeightedScore || "N/A") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(524:40) {:else}",
    		ctx
    	});

    	return block;
    }

    // (522:40) {#if $filterOptions}
    function create_if_block_2$3(ctx) {
    	let t_value = (/*anime*/ ctx[59]?.shownScore || "N/A") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t_value !== (t_value = (/*anime*/ ctx[59]?.shownScore || "N/A") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(522:40) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (427:12) {#each $finalAnimeList || [] as anime, animeIdx (anime?.id || {}
    function create_each_block_2$2(key_1, ctx) {
    	let div3;
    	let div2;
    	let t0;
    	let span4;
    	let span0;
    	let t1_value = (/*anime*/ ctx[59]?.shownTitle || "N/A") + "";
    	let t1;
    	let span0_copy_value_value;
    	let span0_copy_value___value;
    	let t2;
    	let span3;
    	let div0;
    	let span1;
    	let svg0;
    	let path0;
    	let svg0_class_value;
    	let t3;
    	let show_if;
    	let t4;
    	let div1;
    	let span2;
    	let svg1;
    	let path1;
    	let svg1_class_value;
    	let t5;
    	let span3_copy_value_value;
    	let span3_copy_value___value;
    	let div2_tabindex_value;
    	let div3_title_value;
    	let each_value_2 = /*each_value_2*/ ctx[60];
    	let animeIdx = /*animeIdx*/ ctx[61];
    	let mounted;
    	let dispose;
    	let if_block0 = (/*anime*/ ctx[59]?.coverImageUrl || /*anime*/ ctx[59]?.bannerImageUrl || /*anime*/ ctx[59]?.trailerThumbnailUrl) && create_if_block_4$3(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (dirty[0] & /*$finalAnimeList*/ 4096) show_if = null;
    		if (show_if == null) show_if = !!isJsonObject(/*anime*/ ctx[59]?.nextAiringEpisode);
    		if (show_if) return create_if_block_3$3;
    		return create_else_block_1$2;
    	}

    	let current_block_type = select_block_type_1(ctx, [-1, -1, -1]);
    	let if_block1 = current_block_type(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[15]) return create_if_block_2$3;
    		return create_else_block$2;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block2 = current_block_type_1(ctx);

    	function pointerdown_handler(...args) {
    		return /*pointerdown_handler*/ ctx[28](/*animeIdx*/ ctx[61], ...args);
    	}

    	function keydown_handler(...args) {
    		return /*keydown_handler*/ ctx[29](/*animeIdx*/ ctx[61], ...args);
    	}

    	const assign_div3 = () => /*div3_binding*/ ctx[30](div3, each_value_2, animeIdx);
    	const unassign_div3 = () => /*div3_binding*/ ctx[30](null, each_value_2, animeIdx);

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
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t3 = space();
    			if_block1.c();
    			t4 = space();
    			div1 = element("div");
    			span2 = element("span");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t5 = space();
    			if_block2.c();
    			attr_dev(span0, "class", "title copy svelte-xo6vxz");
    			attr_dev(span0, "copy-value", span0_copy_value_value = /*anime*/ ctx[59]?.copiedTitle || "");
    			attr_dev(span0, "copy-value-2", span0_copy_value___value = /*anime*/ ctx[59]?.shownTitle || "");
    			add_location(span0, file$7, 473, 28, 18821);
    			attr_dev(path0, "d", "M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512z");
    			add_location(path0, file$7, 490, 45, 19807);
    			attr_dev(svg0, "viewBox", "0 0 512 512");
    			attr_dev(svg0, "class", svg0_class_value = "" + (null_to_empty(`${/*anime*/ ctx[59]?.userStatusColor}-fill circle`) + " svelte-xo6vxz"));
    			add_location(svg0, file$7, 487, 40, 19596);
    			attr_dev(span1, "class", "svelte-xo6vxz");
    			add_location(span1, file$7, 485, 36, 19491);
    			attr_dev(div0, "class", "brief-info svelte-xo6vxz");
    			add_location(div0, file$7, 484, 32, 19429);
    			attr_dev(path1, "d", "M317 18a32 32 0 0 0-58 0l-64 132-144 22a32 32 0 0 0-17 54l104 103-25 146a32 32 0 0 0 47 33l128-68 129 68a32 32 0 0 0 46-33l-24-146 104-103a32 32 0 0 0-18-54l-144-22-64-132z");
    			add_location(path1, file$7, 517, 45, 21489);
    			attr_dev(svg1, "viewBox", "0 0 576 512");
    			attr_dev(svg1, "class", svg1_class_value = "" + (null_to_empty(`${/*anime*/ ctx[59]?.contentCautionColor}-fill star`) + " svelte-xo6vxz"));
    			add_location(svg1, file$7, 514, 40, 21276);
    			attr_dev(span2, "class", "svelte-xo6vxz");
    			add_location(span2, file$7, 512, 36, 21173);
    			attr_dev(div1, "class", "brief-info svelte-xo6vxz");
    			add_location(div1, file$7, 511, 32, 21111);
    			attr_dev(span3, "class", "brief-info-wrapper copy svelte-xo6vxz");
    			attr_dev(span3, "copy-value", span3_copy_value_value = /*anime*/ ctx[59]?.copiedTitle || "");
    			attr_dev(span3, "copy-value-2", span3_copy_value___value = /*anime*/ ctx[59]?.shownTitle || "");
    			add_location(span3, file$7, 479, 28, 19151);
    			attr_dev(span4, "class", "image-grid__card-title svelte-xo6vxz");
    			add_location(span4, file$7, 472, 24, 18754);
    			attr_dev(div2, "class", "shimmer svelte-xo6vxz");
    			attr_dev(div2, "tabindex", div2_tabindex_value = /*$popupVisible*/ ctx[10] ? "" : "0");
    			add_location(div2, file$7, 433, 20, 16582);
    			attr_dev(div3, "class", "image-grid__card svelte-xo6vxz");
    			attr_dev(div3, "title", div3_title_value = /*anime*/ ctx[59]?.briefInfo || "");
    			add_location(div3, file$7, 427, 16, 16312);
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
    			append_dev(span1, svg0);
    			append_dev(svg0, path0);
    			append_dev(span1, t3);
    			if_block1.m(span1, null);
    			append_dev(span3, t4);
    			append_dev(span3, div1);
    			append_dev(div1, span2);
    			append_dev(span2, svg1);
    			append_dev(svg1, path1);
    			append_dev(span2, t5);
    			if_block2.m(span2, null);
    			assign_div3();

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						div2,
    						"click",
    						function () {
    							if (is_function(/*handleOpenPopup*/ ctx[17](/*animeIdx*/ ctx[61]))) /*handleOpenPopup*/ ctx[17](/*animeIdx*/ ctx[61]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(div2, "pointerdown", pointerdown_handler, false, false, false, false),
    					listen_dev(div2, "pointerup", /*cancelOpenOption*/ ctx[19], false, false, false, false),
    					listen_dev(div2, "pointercancel", /*cancelOpenOption*/ ctx[19], false, false, false, false),
    					listen_dev(div2, "keydown", keydown_handler, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*anime*/ ctx[59]?.coverImageUrl || /*anime*/ ctx[59]?.bannerImageUrl || /*anime*/ ctx[59]?.trailerThumbnailUrl) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$3(ctx);
    					if_block0.c();
    					if_block0.m(div2, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && t1_value !== (t1_value = (/*anime*/ ctx[59]?.shownTitle || "N/A") + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && span0_copy_value_value !== (span0_copy_value_value = /*anime*/ ctx[59]?.copiedTitle || "")) {
    				attr_dev(span0, "copy-value", span0_copy_value_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && span0_copy_value___value !== (span0_copy_value___value = /*anime*/ ctx[59]?.shownTitle || "")) {
    				attr_dev(span0, "copy-value-2", span0_copy_value___value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && svg0_class_value !== (svg0_class_value = "" + (null_to_empty(`${/*anime*/ ctx[59]?.userStatusColor}-fill circle`) + " svelte-xo6vxz"))) {
    				attr_dev(svg0, "class", svg0_class_value);
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

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && svg1_class_value !== (svg1_class_value = "" + (null_to_empty(`${/*anime*/ ctx[59]?.contentCautionColor}-fill star`) + " svelte-xo6vxz"))) {
    				attr_dev(svg1, "class", svg1_class_value);
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_2(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_1(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(span2, null);
    				}
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && span3_copy_value_value !== (span3_copy_value_value = /*anime*/ ctx[59]?.copiedTitle || "")) {
    				attr_dev(span3, "copy-value", span3_copy_value_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && span3_copy_value___value !== (span3_copy_value___value = /*anime*/ ctx[59]?.shownTitle || "")) {
    				attr_dev(span3, "copy-value-2", span3_copy_value___value);
    			}

    			if (dirty[0] & /*$popupVisible*/ 1024 && div2_tabindex_value !== (div2_tabindex_value = /*$popupVisible*/ ctx[10] ? "" : "0")) {
    				attr_dev(div2, "tabindex", div2_tabindex_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 4096 && div3_title_value !== (div3_title_value = /*anime*/ ctx[59]?.briefInfo || "")) {
    				attr_dev(div3, "title", div3_title_value);
    			}

    			if (each_value_2 !== /*each_value_2*/ ctx[60] || animeIdx !== /*animeIdx*/ ctx[61]) {
    				unassign_div3();
    				each_value_2 = /*each_value_2*/ ctx[60];
    				animeIdx = /*animeIdx*/ ctx[61];
    				assign_div3();
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    			if_block2.d();
    			unassign_div3();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$2.name,
    		type: "each",
    		source: "(427:12) {#each $finalAnimeList || [] as anime, animeIdx (anime?.id || {}",
    		ctx
    	});

    	return block;
    }

    // (535:12) {#each Array($shownAllInList ? 0 : 1) as _}
    function create_each_block_1$2(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "shimmer svelte-xo6vxz");
    			add_location(div0, file$7, 536, 20, 22547);
    			attr_dev(div1, "class", "image-grid__card skeleton svelte-xo6vxz");
    			add_location(div1, file$7, 535, 16, 22486);
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
    		source: "(535:12) {#each Array($shownAllInList ? 0 : 1) as _}",
    		ctx
    	});

    	return block;
    }

    // (540:12) {#each Array(isFullViewed ? Math.floor((windowHeight ?? 1100) / 220) : 5) as _}
    function create_each_block$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "image-grid__card svelte-xo6vxz");
    			add_location(div, file$7, 540, 16, 22726);
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
    		source: "(540:12) {#each Array(isFullViewed ? Math.floor((windowHeight ?? 1100) / 220) : 5) as _}",
    		ctx
    	});

    	return block;
    }

    // (556:4) {#if !$android && (shouldShowGoBackInFullView || shouldShowGoBack)}
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
    			/*shouldShowGoBackInFullView*/ ctx[9]
    			? "M41 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 256l138-137a32 32 0 0 0-46-46L41 233z"
    			: // angle up
    				"M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z");

    			add_location(path, file$7, 570, 16, 23821);
    			attr_dev(svg, "viewBox", svg_viewBox_value = `0 0 ${/*shouldShowGoBackInFullView*/ ctx[9] ? "320" : "448"} 512`);
    			attr_dev(svg, "class", "svelte-xo6vxz");
    			add_location(svg, file$7, 565, 12, 23661);
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("go-back-grid" + (/*shouldShowGoBackInFullView*/ ctx[9] ? " fullView" : "")) + " svelte-xo6vxz"));
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file$7, 557, 8, 23358);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*goBackGrid*/ ctx[20], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_1*/ ctx[34], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*shouldShowGoBackInFullView*/ 512 && path_d_value !== (path_d_value = // angle left
    			/*shouldShowGoBackInFullView*/ ctx[9]
    			? "M41 233a32 32 0 0 0 0 46l160 160a32 32 0 0 0 46-46L109 256l138-137a32 32 0 0 0-46-46L41 233z"
    			: // angle up
    				"M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z")) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (!current || dirty[0] & /*shouldShowGoBackInFullView*/ 512 && svg_viewBox_value !== (svg_viewBox_value = `0 0 ${/*shouldShowGoBackInFullView*/ ctx[9] ? "320" : "448"} 512`)) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}

    			if (!current || dirty[0] & /*shouldShowGoBackInFullView*/ 512 && div_class_value !== (div_class_value = "" + (null_to_empty("go-back-grid" + (/*shouldShowGoBackInFullView*/ ctx[9] ? " fullView" : "")) + " svelte-xo6vxz"))) {
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
    		source: "(556:4) {#if !$android && (shouldShowGoBackInFullView || shouldShowGoBack)}",
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
    		if (/*$finalAnimeList*/ ctx[12]?.length) return create_if_block_1$6;
    		if (!/*$finalAnimeList*/ ctx[12] || /*$initData*/ ctx[14]) return create_if_block_5$2;
    		return create_else_block_2$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = !/*$android*/ ctx[4] && (/*shouldShowGoBackInFullView*/ ctx[9] || /*shouldShowGoBack*/ ctx[8]) && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "id", "anime-grid");

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("image-grid " + (/*isFullViewed*/ ctx[3] ? " fullView" : "") + (/*$finalAnimeList*/ ctx[12]?.length === 0 && !/*$initData*/ ctx[14]
    			? "empty"
    			: "")) + " svelte-xo6vxz"));

    			set_style(div, "--anime-grid-height", /*windowHeight*/ ctx[5] + "px");
    			add_location(div, file$7, 395, 4, 15062);
    			attr_dev(main, "class", main_class_value = "" + (null_to_empty(/*isFullViewed*/ ctx[3] ? "fullView" : "") + " svelte-xo6vxz"));
    			add_location(main, file$7, 394, 0, 15011);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			if_block0.m(div, null);
    			/*div_binding*/ ctx[31](div);
    			append_dev(main, t);
    			if (if_block1) if_block1.m(main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "wheel", /*wheel_handler*/ ctx[32], false, false, false, false),
    					listen_dev(div, "scroll", /*scroll_handler*/ ctx[33], false, false, false, false)
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

    			if (!current || dirty[0] & /*isFullViewed, $finalAnimeList, $initData*/ 20488 && div_class_value !== (div_class_value = "" + (null_to_empty("image-grid " + (/*isFullViewed*/ ctx[3] ? " fullView" : "") + (/*$finalAnimeList*/ ctx[12]?.length === 0 && !/*$initData*/ ctx[14]
    			? "empty"
    			: "")) + " svelte-xo6vxz"))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty[0] & /*windowHeight*/ 32) {
    				set_style(div, "--anime-grid-height", /*windowHeight*/ ctx[5] + "px");
    			}

    			if (!/*$android*/ ctx[4] && (/*shouldShowGoBackInFullView*/ ctx[9] || /*shouldShowGoBack*/ ctx[8])) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$android, shouldShowGoBackInFullView, shouldShowGoBack*/ 784) {
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

    			if (!current || dirty[0] & /*isFullViewed*/ 8 && main_class_value !== (main_class_value = "" + (null_to_empty(/*isFullViewed*/ ctx[3] ? "fullView" : "") + " svelte-xo6vxz"))) {
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
    			/*div_binding*/ ctx[31](null);
    			if (if_block1) if_block1.d();
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

    function instance$7($$self, $$props, $$invalidate) {
    	let isFullViewed;
    	let shouldShowGoBackInFullView;
    	let shouldShowGoBack;
    	let $android;
    	let $listUpdateAvailable;
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
    	let $dataStatus;
    	let $animeIdxRemoved;
    	let $mostRecentAiringDateTimeout;
    	let $earlisetReleaseDate;
    	let $importantLoad;
    	let $initData;
    	let $filterOptions;
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(4, $android = $$value));
    	validate_store(listUpdateAvailable, 'listUpdateAvailable');
    	component_subscribe($$self, listUpdateAvailable, $$value => $$invalidate(24, $listUpdateAvailable = $$value));
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(25, $gridFullView = $$value));
    	validate_store(animeOptionVisible, 'animeOptionVisible');
    	component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(40, $animeOptionVisible = $$value));
    	validate_store(openedAnimeOptionIdx, 'openedAnimeOptionIdx');
    	component_subscribe($$self, openedAnimeOptionIdx, $$value => $$invalidate(41, $openedAnimeOptionIdx = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(10, $popupVisible = $$value));
    	validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
    	component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(42, $openedAnimePopupIdx = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(43, $animeLoaderWorker = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(44, $checkAnimeLoaderStatus = $$value));
    	validate_store(shownAllInList, 'shownAllInList');
    	component_subscribe($$self, shownAllInList, $$value => $$invalidate(11, $shownAllInList = $$value));
    	validate_store(asyncAnimeReloaded, 'asyncAnimeReloaded');
    	component_subscribe($$self, asyncAnimeReloaded, $$value => $$invalidate(45, $asyncAnimeReloaded = $$value));
    	validate_store(animeObserver, 'animeObserver');
    	component_subscribe($$self, animeObserver, $$value => $$invalidate(46, $animeObserver = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(12, $finalAnimeList = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(47, $dataStatus = $$value));
    	validate_store(animeIdxRemoved, 'animeIdxRemoved');
    	component_subscribe($$self, animeIdxRemoved, $$value => $$invalidate(48, $animeIdxRemoved = $$value));
    	validate_store(mostRecentAiringDateTimeout, 'mostRecentAiringDateTimeout');
    	component_subscribe($$self, mostRecentAiringDateTimeout, $$value => $$invalidate(49, $mostRecentAiringDateTimeout = $$value));
    	validate_store(earlisetReleaseDate, 'earlisetReleaseDate');
    	component_subscribe($$self, earlisetReleaseDate, $$value => $$invalidate(13, $earlisetReleaseDate = $$value));
    	validate_store(importantLoad, 'importantLoad');
    	component_subscribe($$self, importantLoad, $$value => $$invalidate(50, $importantLoad = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(14, $initData = $$value));
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(15, $filterOptions = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AnimeGrid', slots, []);
    	let windowHeight = Math.max(window.visualViewport.height, window.innerHeight);
    	let windowWidth = Math.max(window.visualViewport.width, window.innerWidth);
    	let animeGridEl;
    	let isRunningIntersectEvent;
    	let numberOfLoadedGrid = 13;
    	let observerDelay = 16;

    	function addLastAnimeObserver() {
    		isRunningIntersectEvent = false;

    		set_store_value(
    			animeObserver,
    			$animeObserver = new IntersectionObserver(entries => {
    					if ($shownAllInList) return;

    					entries.forEach(entry => {
    						if (entry.isIntersecting) {
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
    		$$invalidate(5, windowHeight = Math.max(window.visualViewport.height, window.innerHeight));
    		$$invalidate(22, windowWidth = Math.max(window.visualViewport.width, window.innerWidth));
    		$$invalidate(6, animeGridEl = animeGridEl || document.getElementById("anime-grid"));

    		window.addEventListener("resize", () => {
    			$$invalidate(5, windowHeight = Math.max(window.visualViewport.height, window.innerHeight));
    			$$invalidate(22, windowWidth = Math.max(window.visualViewport.width, window.innerWidth));
    		});
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

    				if (data?.status !== undefined) set_store_value(dataStatus, $dataStatus = data.status, $dataStatus); else if (data.getEarlisetReleaseDate === true) {
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
    						set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
    						isAsyncLoad = true;
    					} else if (data.isNew === true) {
    						set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
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
    				set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);
    				console.error(error);
    			};

    			val?.postMessage?.({ getEarlisetReleaseDate: true });
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
    			}

    			if (isAsyncLoad) {
    				set_store_value(asyncAnimeReloaded, $asyncAnimeReloaded = !$asyncAnimeReloaded, $asyncAnimeReloaded);
    				isAsyncLoad = false;
    			}
    		} else {
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

    	let lastLeftScroll, currentLeftScroll;
    	let scrollingToBottom;
    	let belowGrid;
    	let afterFullGrid;
    	let checkedOriginalSizeForGridView = windowWidth > 750 && windowHeight > 695;

    	window.addEventListener(
    		"scroll",
    		() => {
    			if (document.documentElement.scrollTop > 500) {
    				$$invalidate(23, belowGrid = true);
    			} else {
    				$$invalidate(23, belowGrid = false);
    			}
    		},
    		{ passive: true }
    	);

    	function goBackGrid() {
    		if (isFullViewed) {
    			$$invalidate(6, animeGridEl.style.overflow = "hidden", animeGridEl);
    			$$invalidate(6, animeGridEl.style.overflow = "", animeGridEl);

    			animeGridEl?.children?.[0]?.scrollIntoView?.({
    				container: animeGridEl,
    				behavior: "smooth",
    				block: "nearest",
    				inline: "start"
    			});
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
    			$$invalidate(6, animeGridEl);
    		});
    	}

    	const wheel_handler = e => {
    		if (isFullViewed) {
    			horizontalWheel$1(e, "image-grid");

    			if (!scrollingToBottom) {
    				$$invalidate(7, scrollingToBottom = true);
    				let newScrollPosition = window.scrollMaxY || Number.MAX_SAFE_INTEGER;
    				document.documentElement.scrollTop = newScrollPosition;
    				$$invalidate(7, scrollingToBottom = false);
    			}
    		}
    	};

    	const scroll_handler = e => {
    		let element = e?.target;
    		$$invalidate(0, lastLeftScroll = currentLeftScroll);
    		$$invalidate(1, currentLeftScroll = element?.scrollLeft);

    		if (currentLeftScroll > 500) {
    			$$invalidate(2, afterFullGrid = true);
    		} else {
    			$$invalidate(2, afterFullGrid = false);
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
    		filterOptions,
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
    		listUpdateAvailable,
    		addClass,
    		isJsonObject,
    		removeClass,
    		getLocalStorage,
    		fade,
    		cacheImage,
    		emptyImage: emptyImage$1,
    		windowHeight,
    		windowWidth,
    		animeGridEl,
    		isRunningIntersectEvent,
    		numberOfLoadedGrid,
    		observerDelay,
    		addLastAnimeObserver,
    		animeLoaderIsAlivePromise,
    		checkAnimeLoaderStatusTimeout,
    		isAsyncLoad,
    		handleOpenPopup,
    		openOptionTimeout,
    		handleOpenOption,
    		cancelOpenOption,
    		getFinishedEpisode,
    		horizontalWheel: horizontalWheel$1,
    		lastLeftScroll,
    		currentLeftScroll,
    		scrollingToBottom,
    		belowGrid,
    		afterFullGrid,
    		checkedOriginalSizeForGridView,
    		goBackGrid,
    		addImage,
    		isFullViewed,
    		shouldShowGoBack,
    		shouldShowGoBackInFullView,
    		$android,
    		$listUpdateAvailable,
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
    		$dataStatus,
    		$animeIdxRemoved,
    		$mostRecentAiringDateTimeout,
    		$earlisetReleaseDate,
    		$importantLoad,
    		$initData,
    		$filterOptions
    	});

    	$$self.$inject_state = $$props => {
    		if ('windowHeight' in $$props) $$invalidate(5, windowHeight = $$props.windowHeight);
    		if ('windowWidth' in $$props) $$invalidate(22, windowWidth = $$props.windowWidth);
    		if ('animeGridEl' in $$props) $$invalidate(6, animeGridEl = $$props.animeGridEl);
    		if ('isRunningIntersectEvent' in $$props) isRunningIntersectEvent = $$props.isRunningIntersectEvent;
    		if ('numberOfLoadedGrid' in $$props) $$invalidate(16, numberOfLoadedGrid = $$props.numberOfLoadedGrid);
    		if ('observerDelay' in $$props) observerDelay = $$props.observerDelay;
    		if ('animeLoaderIsAlivePromise' in $$props) animeLoaderIsAlivePromise = $$props.animeLoaderIsAlivePromise;
    		if ('checkAnimeLoaderStatusTimeout' in $$props) checkAnimeLoaderStatusTimeout = $$props.checkAnimeLoaderStatusTimeout;
    		if ('isAsyncLoad' in $$props) isAsyncLoad = $$props.isAsyncLoad;
    		if ('openOptionTimeout' in $$props) openOptionTimeout = $$props.openOptionTimeout;
    		if ('lastLeftScroll' in $$props) $$invalidate(0, lastLeftScroll = $$props.lastLeftScroll);
    		if ('currentLeftScroll' in $$props) $$invalidate(1, currentLeftScroll = $$props.currentLeftScroll);
    		if ('scrollingToBottom' in $$props) $$invalidate(7, scrollingToBottom = $$props.scrollingToBottom);
    		if ('belowGrid' in $$props) $$invalidate(23, belowGrid = $$props.belowGrid);
    		if ('afterFullGrid' in $$props) $$invalidate(2, afterFullGrid = $$props.afterFullGrid);
    		if ('checkedOriginalSizeForGridView' in $$props) $$invalidate(53, checkedOriginalSizeForGridView = $$props.checkedOriginalSizeForGridView);
    		if ('isFullViewed' in $$props) $$invalidate(3, isFullViewed = $$props.isFullViewed);
    		if ('shouldShowGoBack' in $$props) $$invalidate(8, shouldShowGoBack = $$props.shouldShowGoBack);
    		if ('shouldShowGoBackInFullView' in $$props) $$invalidate(9, shouldShowGoBackInFullView = $$props.shouldShowGoBackInFullView);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*$gridFullView, $android*/ 33554448) {
    			$$invalidate(3, isFullViewed = $gridFullView ?? getLocalStorage("gridFullView") ?? (!$android && checkedOriginalSizeForGridView));
    		}

    		if ($$self.$$.dirty[0] & /*isFullViewed, afterFullGrid, currentLeftScroll, lastLeftScroll, windowWidth*/ 4194319) {
    			$$invalidate(9, shouldShowGoBackInFullView = isFullViewed && afterFullGrid && (currentLeftScroll < lastLeftScroll || windowWidth > 596.5));
    		}

    		if ($$self.$$.dirty[0] & /*isFullViewed, $listUpdateAvailable, belowGrid*/ 25165832) {
    			$$invalidate(8, shouldShowGoBack = !isFullViewed && !$listUpdateAvailable && belowGrid);
    		}
    	};

    	return [
    		lastLeftScroll,
    		currentLeftScroll,
    		afterFullGrid,
    		isFullViewed,
    		$android,
    		windowHeight,
    		animeGridEl,
    		scrollingToBottom,
    		shouldShowGoBack,
    		shouldShowGoBackInFullView,
    		$popupVisible,
    		$shownAllInList,
    		$finalAnimeList,
    		$earlisetReleaseDate,
    		$initData,
    		$filterOptions,
    		numberOfLoadedGrid,
    		handleOpenPopup,
    		handleOpenOption,
    		cancelOpenOption,
    		goBackGrid,
    		addImage,
    		windowWidth,
    		belowGrid,
    		$listUpdateAvailable,
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {}, null, [-1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AnimeGrid",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

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
                            listUpdateAvailable.set(false);
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
        if (get_store_value(android$1)) {
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
    const file$6 = "src\\components\\Anime\\Fixed\\AnimePopup.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[118] = list[i];
    	child_ctx[119] = list;
    	child_ctx[120] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[121] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[124] = list[i];
    	return child_ctx;
    }

    function get_each_context_3$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[127] = list[i];
    	return child_ctx;
    }

    // (1337:8) {#if $finalAnimeList?.length}
    function create_if_block_3$2(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t;
    	let if_block_anchor;
    	let each_value = /*$finalAnimeList*/ ctx[9] || [];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*anime*/ ctx[118]?.id || {};
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	let if_block = /*$finalAnimeList*/ ctx[9]?.length && !/*$shownAllInList*/ ctx[15] && create_if_block_4$2(ctx);

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
    			if (dirty[0] & /*$finalAnimeList, $popupIsGoingBack, handleMoreVideos, handleHideShow, $hiddenEntries, windowWidth, windowHeight, fullDescriptionPopup, fullImagePopup, itemScroll, $earlisetReleaseDate, getFormattedAnimeFormat, updateList, $listIsUpdating, $listUpdateAvailable, $autoPlay, askToOpenYoutube*/ 12484275) {
    				each_value = /*$finalAnimeList*/ ctx[9] || [];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, t.parentNode, destroy_block, create_each_block$1, t, get_each_context$1);
    			}

    			if (/*$finalAnimeList*/ ctx[9]?.length && !/*$shownAllInList*/ ctx[15]) {
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
    		source: "(1337:8) {#if $finalAnimeList?.length}",
    		ctx
    	});

    	return block;
    }

    // (1360:28) {#if anime.trailerID}
    function create_if_block_18(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "trailer display-none svelte-wl7my9");
    			add_location(div, file$6, 1360, 32, 52737);
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
    		id: create_if_block_18.name,
    		type: "if",
    		source: "(1360:28) {#if anime.trailerID}",
    		ctx
    	});

    	return block;
    }

    // (1364:32) {#if anime.bannerImageUrl || anime.trailerThumbnailUrl}
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

    			attr_dev(img, "alt", img_alt_value = (/*anime*/ ctx[118]?.shownTitle || "") + (/*anime*/ ctx[118].bannerImageUrl
    			? " Banner"
    			: " Thumbnail"));

    			attr_dev(img, "class", "bannerImg fade-out svelte-wl7my9");
    			add_location(img, file$6, 1364, 36, 52988);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(addImage_action = /*addImage*/ ctx[32].call(null, img, /*anime*/ ctx[118].bannerImageUrl || /*anime*/ ctx[118].trailerThumbnailUrl || emptyImage)),
    					listen_dev(img, "load", /*load_handler*/ ctx[34], false, false, false, false),
    					listen_dev(img, "error", /*error_handler*/ ctx[35], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 512 && img_alt_value !== (img_alt_value = (/*anime*/ ctx[118]?.shownTitle || "") + (/*anime*/ ctx[118].bannerImageUrl
    			? " Banner"
    			: " Thumbnail"))) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (addImage_action && is_function(addImage_action.update) && dirty[0] & /*$finalAnimeList*/ 512) addImage_action.update.call(null, /*anime*/ ctx[118].bannerImageUrl || /*anime*/ ctx[118].trailerThumbnailUrl || emptyImage);
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
    		source: "(1364:32) {#if anime.bannerImageUrl || anime.trailerThumbnailUrl}",
    		ctx
    	});

    	return block;
    }

    // (1428:65) 
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
    		source: "(1428:65) ",
    		ctx
    	});

    	return block;
    }

    // (1426:36) {#if windowWidth >= 290}
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
    		source: "(1426:36) {#if windowWidth >= 290}",
    		ctx
    	});

    	return block;
    }

    // (1433:28) {#if $listUpdateAvailable}
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
    			add_location(path, file$6, 1447, 40, 57739);
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "class", svg_class_value = "" + (null_to_empty("list-update-icon" + (/*$listIsUpdating*/ ctx[13] ? " spin" : "")) + " svelte-wl7my9"));
    			add_location(svg, file$6, 1442, 36, 57443);
    			attr_dev(h3, "class", "list-update-label svelte-wl7my9");
    			add_location(h3, file$6, 1451, 36, 58230);
    			attr_dev(div, "class", "list-update-container svelte-wl7my9");
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file$6, 1434, 32, 56997);
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
    					listen_dev(div, "click", /*updateList*/ ctx[20], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_3*/ ctx[43], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$listIsUpdating*/ 8192 && svg_class_value !== (svg_class_value = "" + (null_to_empty("list-update-icon" + (/*$listIsUpdating*/ ctx[13] ? " spin" : "")) + " svelte-wl7my9"))) {
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
    		source: "(1433:28) {#if $listUpdateAvailable}",
    		ctx
    	});

    	return block;
    }

    // (1463:28) {#if anime.bannerImageUrl || anime.trailerThumbnailUrl}
    function create_if_block_13$1(ctx) {
    	let div;
    	let svg;
    	let path;
    	let t0;
    	let h3;

    	let t1_value = (/*anime*/ ctx[118].bannerImageUrl
    	? "Banner"
    	: "Thumbnail") + "";

    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[44](/*anime*/ ctx[118]);
    	}

    	function keydown_handler_4(...args) {
    		return /*keydown_handler_4*/ ctx[45](/*anime*/ ctx[118], ...args);
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
    			add_location(path, file$6, 1489, 40, 60468);
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "class", "banner-image-icon svelte-wl7my9");
    			add_location(svg, file$6, 1485, 36, 60253);
    			attr_dev(h3, "class", "banner-image-label svelte-wl7my9");
    			add_location(h3, file$6, 1493, 36, 60900);
    			attr_dev(div, "class", "banner-image-button svelte-wl7my9");
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file$6, 1464, 32, 59000);
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

    			if (dirty[0] & /*$finalAnimeList*/ 512 && t1_value !== (t1_value = (/*anime*/ ctx[118].bannerImageUrl
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
    		source: "(1463:28) {#if anime.bannerImageUrl || anime.trailerThumbnailUrl}",
    		ctx
    	});

    	return block;
    }

    // (1588:36) {:else}
    function create_else_block_2$1(ctx) {
    	let h4;
    	let t0_value = (/*anime*/ ctx[118]?.format || "NA") + "";
    	let t0;
    	let t1;
    	let html_tag;
    	let raw_value = (/*getFormattedAnimeFormat*/ ctx[21](/*anime*/ ctx[118]) || " · NA") + "";
    	let t2;
    	let t3_value = (/*anime*/ ctx[118]?.formattedDuration || " · NA") + "";
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
    			attr_dev(h4, "class", "svelte-wl7my9");
    			add_location(h4, file$6, 1588, 40, 66870);
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
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t0_value !== (t0_value = (/*anime*/ ctx[118]?.format || "NA") + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*$finalAnimeList*/ 512 && raw_value !== (raw_value = (/*getFormattedAnimeFormat*/ ctx[21](/*anime*/ ctx[118]) || " · NA") + "")) html_tag.p(raw_value);
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t3_value !== (t3_value = (/*anime*/ ctx[118]?.formattedDuration || " · NA") + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2$1.name,
    		type: "else",
    		source: "(1588:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1577:36) {#if anime?.nextAiringEpisode?.airingAt}
    function create_if_block_12$1(ctx) {
    	let h4;
    	let t0_value = (/*anime*/ ctx[118]?.format || "NA") + "";
    	let t0;
    	let t1;
    	let previous_key = /*$earlisetReleaseDate*/ ctx[14] || 1;
    	let t2;
    	let t3_value = (/*anime*/ ctx[118]?.formattedDuration || " · NA") + "";
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
    			attr_dev(h4, "class", "svelte-wl7my9");
    			add_location(h4, file$6, 1577, 40, 66198);
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
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t0_value !== (t0_value = (/*anime*/ ctx[118]?.format || "NA") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$earlisetReleaseDate*/ 16384 && safe_not_equal(previous_key, previous_key = /*$earlisetReleaseDate*/ ctx[14] || 1)) {
    				key_block.d(1);
    				key_block = create_key_block(ctx);
    				key_block.c();
    				key_block.m(h4, t2);
    			} else {
    				key_block.p(ctx, dirty);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && t3_value !== (t3_value = (/*anime*/ ctx[118]?.formattedDuration || " · NA") + "")) set_data_dev(t3, t3_value);
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
    		source: "(1577:36) {#if anime?.nextAiringEpisode?.airingAt}",
    		ctx
    	});

    	return block;
    }

    // (1580:44) {#key $earlisetReleaseDate || 1}
    function create_key_block(ctx) {
    	let html_tag;
    	let raw_value = (/*getFormattedAnimeFormat*/ ctx[21](/*anime*/ ctx[118]) || " · NA") + "";
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
    			if (dirty[0] & /*$finalAnimeList*/ 512 && raw_value !== (raw_value = (/*getFormattedAnimeFormat*/ ctx[21](/*anime*/ ctx[118]) || " · NA") + "")) html_tag.p(raw_value);
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
    		source: "(1580:44) {#key $earlisetReleaseDate || 1}",
    		ctx
    	});

    	return block;
    }

    // (1616:36) {:else}
    function create_else_block_1$1(ctx) {
    	let h4;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			h4.textContent = "NA";
    			attr_dev(h4, "class", "svelte-wl7my9");
    			add_location(h4, file$6, 1616, 40, 68531);
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
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(1616:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1598:36) {#if anime?.season || anime?.year}
    function create_if_block_11$1(ctx) {
    	let span;

    	let t_value = (`${/*anime*/ ctx[118]?.season || ""}${(/*anime*/ ctx[118]?.year)
	? " " + /*anime*/ ctx[118].year
	: ""}` || "NA") + "";

    	let t;
    	let span_copy_value_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			set_style(span, "text-align", "right");
    			attr_dev(span, "class", "copy svelte-wl7my9");

    			attr_dev(span, "copy-value", span_copy_value_value = `${/*anime*/ ctx[118]?.season || ""}${(/*anime*/ ctx[118]?.year)
			? " " + /*anime*/ ctx[118].year
			: ""}` || "NA");

    			add_location(span, file$6, 1598, 40, 67470);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t_value !== (t_value = (`${/*anime*/ ctx[118]?.season || ""}${(/*anime*/ ctx[118]?.year)
			? " " + /*anime*/ ctx[118].year
			: ""}` || "NA") + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && span_copy_value_value !== (span_copy_value_value = `${/*anime*/ ctx[118]?.season || ""}${(/*anime*/ ctx[118]?.year)
			? " " + /*anime*/ ctx[118].year
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
    		id: create_if_block_11$1.name,
    		type: "if",
    		source: "(1598:36) {#if anime?.season || anime?.year}",
    		ctx
    	});

    	return block;
    }

    // (1649:44) {#if anime.userScore != null}
    function create_if_block_10$1(ctx) {
    	let t0_value = " · " + "";
    	let t0;
    	let t1;
    	let svg;
    	let path;
    	let t2;
    	let t3_value = /*anime*/ ctx[118].userScore + "";
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
    			add_location(path, file$6, 1652, 53, 70674);
    			attr_dev(svg, "viewBox", "0 0 576 512");
    			attr_dev(svg, "class", "svelte-wl7my9");
    			add_location(svg, file$6, 1651, 48, 70593);
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
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t3_value !== (t3_value = /*anime*/ ctx[118].userScore + "")) set_data_dev(t3, t3_value);
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
    		source: "(1649:44) {#if anime.userScore != null}",
    		ctx
    	});

    	return block;
    }

    // (1670:36) {#if anime.studios?.length}
    function create_if_block_9$1(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_3 = /*anime*/ ctx[118].studios;
    	validate_each_argument(each_value_3);
    	const get_key = ctx => /*studios*/ ctx[127]?.studio || {};
    	validate_each_keys(ctx, each_value_3, get_each_context_3$1, get_key);

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		let child_ctx = get_each_context_3$1(ctx, each_value_3, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_3$1(key, child_ctx));
    	}

    	function mouseenter_handler(...args) {
    		return /*mouseenter_handler*/ ctx[46](/*anime*/ ctx[118], /*each_value*/ ctx[119], /*anime_index*/ ctx[120], ...args);
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

    			attr_dev(div0, "class", "info-categ svelte-wl7my9");
    			add_location(div0, file$6, 1671, 44, 72071);
    			attr_dev(div1, "class", "" + (null_to_empty("studio-popup info") + " svelte-wl7my9"));
    			set_style(div1, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			add_location(div1, file$6, 1674, 44, 72250);
    			attr_dev(div2, "class", "svelte-wl7my9");
    			add_location(div2, file$6, 1670, 40, 72020);
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
    					listen_dev(div1, "scroll", /*itemScroll*/ ctx[23], false, false, false, false),
    					listen_dev(div1, "mouseenter", mouseenter_handler, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 512) {
    				each_value_3 = /*anime*/ ctx[118].studios;
    				validate_each_argument(each_value_3);
    				validate_each_keys(ctx, each_value_3, get_each_context_3$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_3, each_1_lookup, div1, destroy_block, create_each_block_3$1, null, get_each_context_3$1);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 128) {
    				set_style(div1, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
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
    		source: "(1670:36) {#if anime.studios?.length}",
    		ctx
    	});

    	return block;
    }

    // (1699:48) {#each anime.studios as studios (studios?.studio || {}
    function create_each_block_3$1(key_1, ctx) {
    	let a;
    	let t0_value = (/*studios*/ ctx[127]?.studio?.studioName || "N/A") + "";
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

    			attr_dev(a, "class", a_class_value = "" + (null_to_empty("copy" + ((/*studios*/ ctx[127]?.studioColor)
    			? ` ${/*studios*/ ctx[127]?.studioColor}-color`
    			: "")) + " svelte-wl7my9"));

    			attr_dev(a, "rel", a_rel_value = (/*studios*/ ctx[127]?.studio?.studioUrl)
    			? "noopener noreferrer"
    			: "");

    			attr_dev(a, "target", a_target_value = (/*studios*/ ctx[127]?.studio?.studioUrl)
    			? "_blank"
    			: "");

    			attr_dev(a, "href", a_href_value = /*studios*/ ctx[127]?.studio?.studioUrl || "javascript:void(0)");
    			attr_dev(a, "copy-value", a_copy_value_value = /*studios*/ ctx[127]?.studio?.studioName || "");
    			add_location(a, file$6, 1699, 52, 73997);
    			this.first = a;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t0_value !== (t0_value = (/*studios*/ ctx[127]?.studio?.studioName || "N/A") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a_class_value !== (a_class_value = "" + (null_to_empty("copy" + ((/*studios*/ ctx[127]?.studioColor)
    			? ` ${/*studios*/ ctx[127]?.studioColor}-color`
    			: "")) + " svelte-wl7my9"))) {
    				attr_dev(a, "class", a_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a_rel_value !== (a_rel_value = (/*studios*/ ctx[127]?.studio?.studioUrl)
    			? "noopener noreferrer"
    			: "")) {
    				attr_dev(a, "rel", a_rel_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a_target_value !== (a_target_value = (/*studios*/ ctx[127]?.studio?.studioUrl)
    			? "_blank"
    			: "")) {
    				attr_dev(a, "target", a_target_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a_href_value !== (a_href_value = /*studios*/ ctx[127]?.studio?.studioUrl || "javascript:void(0)")) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a_copy_value_value !== (a_copy_value_value = /*studios*/ ctx[127]?.studio?.studioName || "")) {
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
    		source: "(1699:48) {#each anime.studios as studios (studios?.studio || {}",
    		ctx
    	});

    	return block;
    }

    // (1728:36) {#if anime.genres.length}
    function create_if_block_8$1(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_2 = /*anime*/ ctx[118].genres;
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*genres*/ ctx[124]?.genre || {};
    	validate_each_keys(ctx, each_value_2, get_each_context_2$1, get_key);

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2$1(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_2$1(key, child_ctx));
    	}

    	function mouseenter_handler_1(...args) {
    		return /*mouseenter_handler_1*/ ctx[47](/*anime*/ ctx[118], /*each_value*/ ctx[119], /*anime_index*/ ctx[120], ...args);
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

    			attr_dev(div0, "class", "info-categ svelte-wl7my9");
    			add_location(div0, file$6, 1729, 44, 76077);
    			attr_dev(div1, "class", "" + (null_to_empty("genres-popup info") + " svelte-wl7my9"));
    			set_style(div1, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			add_location(div1, file$6, 1730, 44, 76159);
    			attr_dev(div2, "class", "svelte-wl7my9");
    			add_location(div2, file$6, 1728, 40, 76026);
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
    					listen_dev(div1, "scroll", /*itemScroll*/ ctx[23], false, false, false, false),
    					listen_dev(div1, "mouseenter", mouseenter_handler_1, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 512) {
    				each_value_2 = /*anime*/ ctx[118].genres;
    				validate_each_argument(each_value_2);
    				validate_each_keys(ctx, each_value_2, get_each_context_2$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_2, each_1_lookup, div1, destroy_block, create_each_block_2$1, null, get_each_context_2$1);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 128) {
    				set_style(div1, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
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
    		source: "(1728:36) {#if anime.genres.length}",
    		ctx
    	});

    	return block;
    }

    // (1755:48) {#each anime.genres as genres (genres?.genre || {}
    function create_each_block_2$1(key_1, ctx) {
    	let span;
    	let t0_value = (/*genres*/ ctx[124]?.genre || "N/A") + "";
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

    			attr_dev(span, "class", span_class_value = "" + (null_to_empty("copy " + ((/*genres*/ ctx[124]?.genreColor)
    			? `${/*genres*/ ctx[124]?.genreColor}-color`
    			: "")) + " svelte-wl7my9"));

    			attr_dev(span, "copy-value", span_copy_value_value = /*genres*/ ctx[124]?.genre || "");
    			add_location(span, file$6, 1755, 52, 77900);
    			this.first = span;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 512 && t0_value !== (t0_value = (/*genres*/ ctx[124]?.genre || "N/A") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && span_class_value !== (span_class_value = "" + (null_to_empty("copy " + ((/*genres*/ ctx[124]?.genreColor)
    			? `${/*genres*/ ctx[124]?.genreColor}-color`
    			: "")) + " svelte-wl7my9"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && span_copy_value_value !== (span_copy_value_value = /*genres*/ ctx[124]?.genre || "")) {
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
    		source: "(1755:48) {#each anime.genres as genres (genres?.genre || {}",
    		ctx
    	});

    	return block;
    }

    // (1770:36) {#if anime?.tags?.length}
    function create_if_block_7$1(ctx) {
    	let div1;
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value_1 = /*anime*/ ctx[118].tags;
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*tags*/ ctx[121]?.tag || {};
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
    	}

    	function mouseenter_handler_2(...args) {
    		return /*mouseenter_handler_2*/ ctx[48](/*anime*/ ctx[118], /*each_value*/ ctx[119], /*anime_index*/ ctx[120], ...args);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "" + (null_to_empty("tags-info-content info") + " svelte-wl7my9"));
    			set_style(div0, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			add_location(div0, file$6, 1771, 44, 78958);
    			attr_dev(div1, "class", "tag-info svelte-wl7my9");
    			add_location(div1, file$6, 1770, 40, 78890);
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
    					listen_dev(div0, "scroll", /*itemScroll*/ ctx[23], false, false, false, false),
    					listen_dev(div0, "mouseenter", mouseenter_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$finalAnimeList*/ 512) {
    				each_value_1 = /*anime*/ ctx[118].tags;
    				validate_each_argument(each_value_1);
    				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div0, destroy_block, create_each_block_1$1, null, get_each_context_1$1);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 128) {
    				set_style(div0, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
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
    		source: "(1770:36) {#if anime?.tags?.length}",
    		ctx
    	});

    	return block;
    }

    // (1796:48) {#each anime.tags as tags (tags?.tag || {}
    function create_each_block_1$1(key_1, ctx) {
    	let span;
    	let html_tag;
    	let raw_value = (/*tags*/ ctx[121]?.tag || "N/A") + "";
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

    			attr_dev(span, "class", span_class_value = "" + (null_to_empty("copy " + ((/*tags*/ ctx[121]?.tagColor)
    			? `${/*tags*/ ctx[121]?.tagColor}-color`
    			: "")) + " svelte-wl7my9"));

    			attr_dev(span, "copy-value", span_copy_value_value = /*tags*/ ctx[121]?.copyValue || "");
    			add_location(span, file$6, 1796, 52, 80692);
    			this.first = span;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			html_tag.m(raw_value, span);
    			append_dev(span, t);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 512 && raw_value !== (raw_value = (/*tags*/ ctx[121]?.tag || "N/A") + "")) html_tag.p(raw_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && span_class_value !== (span_class_value = "" + (null_to_empty("copy " + ((/*tags*/ ctx[121]?.tagColor)
    			? `${/*tags*/ ctx[121]?.tagColor}-color`
    			: "")) + " svelte-wl7my9"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && span_copy_value_value !== (span_copy_value_value = /*tags*/ ctx[121]?.copyValue || "")) {
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
    		source: "(1796:48) {#each anime.tags as tags (tags?.tag || {}",
    		ctx
    	});

    	return block;
    }

    // (1859:36) {#if anime?.description}
    function create_if_block_6$1(ctx) {
    	let div1;
    	let h3;
    	let t1;
    	let div0;
    	let raw_value = editHTMLString(/*anime*/ ctx[118]?.description) + "";
    	let mounted;
    	let dispose;

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[52](/*anime*/ ctx[118]);
    	}

    	function keydown_handler_6(...args) {
    		return /*keydown_handler_6*/ ctx[53](/*anime*/ ctx[118], ...args);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Description";
    			t1 = space();
    			div0 = element("div");
    			attr_dev(h3, "class", "svelte-wl7my9");
    			add_location(h3, file$6, 1882, 44, 86318);
    			attr_dev(div0, "class", "anime-description svelte-wl7my9");
    			add_location(div0, file$6, 1883, 44, 86384);
    			attr_dev(div1, "class", "anime-description-wrapper svelte-wl7my9");
    			attr_dev(div1, "tabindex", "0");
    			add_location(div1, file$6, 1860, 40, 84868);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h3);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			div0.innerHTML = raw_value;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "click", click_handler_4, false, false, false, false),
    					listen_dev(div1, "keydown", keydown_handler_6, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$finalAnimeList*/ 512 && raw_value !== (raw_value = editHTMLString(/*anime*/ ctx[118]?.description) + "")) div0.innerHTML = raw_value;		},
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
    		source: "(1859:36) {#if anime?.description}",
    		ctx
    	});

    	return block;
    }

    // (1921:36) {:else}
    function create_else_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("N/A");
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
    		source: "(1921:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1916:36) {#if $hiddenEntries}
    function create_if_block_5$1(ctx) {
    	let t_value = " " + (/*$hiddenEntries*/ ctx[11][/*anime*/ ctx[118]?.id]
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
    			if (dirty[0] & /*$hiddenEntries, $finalAnimeList*/ 2560 && t_value !== (t_value = " " + (/*$hiddenEntries*/ ctx[11][/*anime*/ ctx[118]?.id]
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
    		source: "(1916:36) {#if $hiddenEntries}",
    		ctx
    	});

    	return block;
    }

    // (1338:12) {#each $finalAnimeList || [] as anime (anime?.id || {}
    function create_each_block$1(key_1, ctx) {
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
    	let each_value = /*each_value*/ ctx[119];
    	let anime_index = /*anime_index*/ ctx[120];
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
    	let t10_value = (/*anime*/ ctx[118]?.shownTitle || "NA") + "";
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

    	let t13_value = (/*anime*/ ctx[118].averageScore != null
    	? /*anime*/ ctx[118].formattedAverageScore || "NA"
    	: "NA") + "";

    	let t13;
    	let t14;

    	let t15_value = "/10 · " + (/*anime*/ ctx[118].popularity != null
    	? /*anime*/ ctx[118].formattedPopularity || "NA"
    	: "NA") + "";

    	let t15;
    	let t16;
    	let t17_value = " · " + "";
    	let t17;
    	let html_tag;
    	let raw_value = (/*anime*/ ctx[118]?.recommendedRatingInfo || "") + "";
    	let h31_copy_value_value;
    	let t18;
    	let div7;
    	let t19;
    	let t20;
    	let div8;
    	let h40;
    	let a1;
    	let span1;
    	let t21_value = (/*anime*/ ctx[118].userStatus || "NA") + "";
    	let t21;
    	let span1_class_value;
    	let t22;
    	let a1_rel_value;
    	let a1_target_value;
    	let a1_href_value;
    	let h40_copy_value_value;
    	let t23;
    	let h41;
    	let t24_value = (/*anime*/ ctx[118].status || "NA") + "";
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
    	let if_block0 = /*anime*/ ctx[118].trailerID && create_if_block_18(ctx);
    	let if_block1 = (/*anime*/ ctx[118].bannerImageUrl || /*anime*/ ctx[118].trailerThumbnailUrl) && create_if_block_17$1(ctx);
    	const assign_div2 = () => /*div2_binding*/ ctx[36](div2, each_value, anime_index);
    	const unassign_div2 = () => /*div2_binding*/ ctx[36](null, each_value, anime_index);

    	function click_handler() {
    		return /*click_handler*/ ctx[37](/*anime*/ ctx[118]);
    	}

    	function keydown_handler(...args) {
    		return /*keydown_handler*/ ctx[38](/*anime*/ ctx[118], ...args);
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*windowWidth*/ ctx[4] >= 290) return create_if_block_15$1;
    		if (/*windowWidth*/ ctx[4] >= 260) return create_if_block_16$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block2 = current_block_type && current_block_type(ctx);
    	let if_block3 = /*$listUpdateAvailable*/ ctx[12] && create_if_block_14$1(ctx);
    	let if_block4 = (/*anime*/ ctx[118].bannerImageUrl || /*anime*/ ctx[118].trailerThumbnailUrl) && create_if_block_13$1(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*anime*/ ctx[118]?.nextAiringEpisode?.airingAt) return create_if_block_12$1;
    		return create_else_block_2$1;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block5 = current_block_type_1(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*anime*/ ctx[118]?.season || /*anime*/ ctx[118]?.year) return create_if_block_11$1;
    		return create_else_block_1$1;
    	}

    	let current_block_type_2 = select_block_type_2(ctx);
    	let if_block6 = current_block_type_2(ctx);
    	let if_block7 = /*anime*/ ctx[118].userScore != null && create_if_block_10$1(ctx);
    	let if_block8 = /*anime*/ ctx[118].studios?.length && create_if_block_9$1(ctx);
    	let if_block9 = /*anime*/ ctx[118].genres.length && create_if_block_8$1(ctx);
    	let if_block10 = /*anime*/ ctx[118]?.tags?.length && create_if_block_7$1(ctx);

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[50](/*anime*/ ctx[118]);
    	}

    	function keydown_handler_5(...args) {
    		return /*keydown_handler_5*/ ctx[51](/*anime*/ ctx[118], ...args);
    	}

    	let if_block11 = /*anime*/ ctx[118]?.description && create_if_block_6$1(ctx);
    	const assign_div11 = () => /*div11_binding*/ ctx[54](div11, each_value, anime_index);
    	const unassign_div11 = () => /*div11_binding*/ ctx[54](null, each_value, anime_index);

    	function select_block_type_3(ctx, dirty) {
    		if (/*$hiddenEntries*/ ctx[11]) return create_if_block_5$1;
    		return create_else_block$1;
    	}

    	let current_block_type_3 = select_block_type_3(ctx);
    	let if_block12 = current_block_type_3(ctx);

    	function keydown_handler_7(...args) {
    		return /*keydown_handler_7*/ ctx[55](/*anime*/ ctx[118], ...args);
    	}

    	function keydown_handler_8(...args) {
    		return /*keydown_handler_8*/ ctx[56](/*anime*/ ctx[118], ...args);
    	}

    	function click_handler_5() {
    		return /*click_handler_5*/ ctx[57](/*anime*/ ctx[118]);
    	}

    	function keydown_handler_9(...args) {
    		return /*keydown_handler_9*/ ctx[58](/*anime*/ ctx[118], ...args);
    	}

    	const assign_div15 = () => /*div15_binding*/ ctx[59](div15, each_value, anime_index);
    	const unassign_div15 = () => /*div15_binding*/ ctx[59](null, each_value, anime_index);

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
    			add_location(path0, file$6, 1354, 36, 52342);
    			attr_dev(svg0, "viewBox", "0 0 320 512");
    			attr_dev(svg0, "class", "svelte-wl7my9");
    			add_location(svg0, file$6, 1353, 32, 52277);
    			attr_dev(div0, "class", "popup-header-loading svelte-wl7my9");
    			add_location(div0, file$6, 1351, 28, 52160);
    			attr_dev(div1, "class", "popup-img svelte-wl7my9");
    			add_location(div1, file$6, 1362, 28, 52838);
    			attr_dev(div2, "class", div2_class_value = "" + (null_to_empty("popup-header " + (/*anime*/ ctx[118].trailerID ? "loader" : "")) + " svelte-wl7my9"));
    			attr_dev(div2, "tabindex", "0");
    			add_location(div2, file$6, 1341, 24, 51634);
    			attr_dev(label0, "class", "disable-interaction svelte-wl7my9");
    			attr_dev(label0, "for", label0_for_value = "auto-play-" + /*anime*/ ctx[118]?.id);
    			add_location(label0, file$6, 1393, 36, 54742);
    			attr_dev(input, "id", input_id_value = "auto-play-" + /*anime*/ ctx[118]?.id);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "autoplayToggle svelte-wl7my9");
    			add_location(input, file$6, 1399, 36, 55063);
    			attr_dev(span0, "class", "slider round svelte-wl7my9");
    			attr_dev(span0, "tabindex", "0");
    			add_location(span0, file$6, 1406, 36, 55497);
    			attr_dev(label1, "class", "switch svelte-wl7my9");
    			add_location(label1, file$6, 1392, 32, 54682);
    			attr_dev(h30, "class", "autoplay-label svelte-wl7my9");
    			add_location(h30, file$6, 1414, 32, 55941);
    			attr_dev(div3, "class", "autoPlay-container svelte-wl7my9");
    			add_location(div3, file$6, 1391, 28, 54616);
    			attr_dev(div4, "class", "popup-controls svelte-wl7my9");
    			add_location(div4, file$6, 1390, 24, 54558);
    			attr_dev(a0, "rel", a0_rel_value = /*anime*/ ctx[118].animeUrl ? "noopener noreferrer" : "");
    			attr_dev(a0, "target", a0_target_value = /*anime*/ ctx[118].animeUrl ? "_blank" : "");
    			attr_dev(a0, "href", a0_href_value = /*anime*/ ctx[118].animeUrl || "javascript:void(0)");
    			attr_dev(a0, "class", a0_class_value = "" + (null_to_empty(/*anime*/ ctx[118]?.contentCautionColor + "-color anime-title copy") + " svelte-wl7my9"));
    			attr_dev(a0, "copy-value", a0_copy_value_value = /*anime*/ ctx[118]?.copiedTitle || "");
    			attr_dev(a0, "copy-value-2", a0_copy_value___value = /*anime*/ ctx[118]?.shownTitle || "");
    			set_style(a0, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			add_location(a0, file$6, 1515, 36, 62046);
    			attr_dev(path1, "d", "M288 0c9 0 17 5 21 14l69 141 153 22c9 2 17 8 20 17s0 18-6 24L434 328l26 156c1 9-2 18-10 24s-17 6-25 1l-137-73-137 73c-8 4-18 4-25-2s-11-14-10-23l26-156L31 218a24 24 0 0 1 14-41l153-22 68-141c4-9 13-14 22-14zm0 79-53 108c-3 7-10 12-18 13L99 219l86 85c5 6 8 13 7 21l-21 120 106-57c7-3 15-3 22 1l105 56-20-120c-1-8 1-15 7-21l86-85-118-17c-8-2-15-7-18-14L288 79z");
    			add_location(path1, file$6, 1536, 45, 63395);
    			attr_dev(svg1, "viewBox", "0 0 576 512");
    			attr_dev(svg1, "class", "svelte-wl7my9");
    			add_location(svg1, file$6, 1535, 40, 63322);
    			attr_dev(b, "class", "svelte-wl7my9");
    			add_location(b, file$6, 1553, 44, 64768);
    			html_tag.a = null;
    			attr_dev(h31, "class", "copy svelte-wl7my9");

    			attr_dev(h31, "copy-value", h31_copy_value_value = (/*anime*/ ctx[118].averageScore != null
    			? /*anime*/ ctx[118].formattedAverageScore || "NA"
    			: "NA") + "/10 · " + (/*anime*/ ctx[118].popularity != null
    			? /*anime*/ ctx[118].formattedPopularity || "NA"
    			: "NA"));

    			add_location(h31, file$6, 1540, 40, 63950);
    			attr_dev(div5, "class", "info-rating-wrapper svelte-wl7my9");
    			add_location(div5, file$6, 1533, 36, 63184);
    			attr_dev(div6, "class", "anime-title-container svelte-wl7my9");
    			set_style(div6, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			add_location(div6, file$6, 1508, 32, 61672);
    			attr_dev(div7, "class", "info-format svelte-wl7my9");
    			set_style(div7, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			add_location(div7, file$6, 1569, 32, 65752);
    			attr_dev(span1, "class", span1_class_value = "" + (null_to_empty(/*anime*/ ctx[118].userStatusColor + "-color") + " svelte-wl7my9"));
    			add_location(span1, file$6, 1642, 45, 70009);
    			attr_dev(a1, "rel", a1_rel_value = /*anime*/ ctx[118].animeUrl ? "noopener noreferrer" : "");
    			attr_dev(a1, "target", a1_target_value = /*anime*/ ctx[118].animeUrl ? "_blank" : "");
    			attr_dev(a1, "href", a1_href_value = /*anime*/ ctx[118].animeUrl || "javascript:void(0)");
    			attr_dev(a1, "class", "svelte-wl7my9");
    			add_location(a1, file$6, 1633, 40, 69444);
    			attr_dev(h40, "class", "copy svelte-wl7my9");

    			attr_dev(h40, "copy-value", h40_copy_value_value = (/*anime*/ ctx[118].userStatus || "NA") + (/*anime*/ ctx[118].userScore != null
    			? " · " + /*anime*/ ctx[118].userScore
    			: ""));

    			add_location(h40, file$6, 1626, 36, 69023);
    			set_style(h41, "text-align", "right");
    			attr_dev(h41, "class", "copy year-season svelte-wl7my9");
    			attr_dev(h41, "copy-value", h41_copy_value_value = /*anime*/ ctx[118].status || "");
    			add_location(h41, file$6, 1660, 36, 71456);
    			attr_dev(div8, "class", "info-status svelte-wl7my9");
    			set_style(div8, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			add_location(div8, file$6, 1619, 32, 68659);
    			attr_dev(div9, "class", "info-contents svelte-wl7my9");
    			add_location(div9, file$6, 1668, 32, 71886);
    			attr_dev(img, "loading", "lazy");
    			attr_dev(img, "width", "150px");
    			attr_dev(img, "height", "210px");

    			attr_dev(img, "alt", img_alt_value = (/*anime*/ ctx[118]?.shownTitle || "") + (/*anime*/ ctx[118].coverImageUrl
    			? " Cover"
    			: /*anime*/ ctx[118].bannerImageUrl
    				? " Banner"
    				: " Thumbnail"));

    			attr_dev(img, "tabindex", "0");

    			attr_dev(img, "class", img_class_value = "" + (null_to_empty("coverImg" + (!/*anime*/ ctx[118].coverImageUrl && !/*anime*/ ctx[118].bannerImageUrl && !/*anime*/ ctx[118].trailerThumbnailUrl
    			? " display-none"
    			: "")) + " svelte-wl7my9"));

    			add_location(img, file$6, 1813, 36, 81803);
    			attr_dev(div10, "class", "info-profile svelte-wl7my9");
    			add_location(div10, file$6, 1811, 32, 81647);
    			attr_dev(div11, "class", "popup-info svelte-wl7my9");
    			set_style(div11, "--windowWidth", /*windowWidth*/ ctx[4] + "px");
    			set_style(div11, "--windowHeight", /*windowHeight*/ ctx[5] + "px");
    			add_location(div11, file$6, 1502, 28, 61340);
    			attr_dev(path2, "d", "M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-72-280h144a24 24 0 1 1 0 48H184a24 24 0 1 1 0-48z");
    			add_location(path2, file$6, 1911, 41, 87916);
    			attr_dev(svg2, "class", "hideshow svelte-wl7my9");
    			attr_dev(svg2, "viewBox", "0 0 512 512");
    			add_location(svg2, file$6, 1910, 36, 87830);
    			attr_dev(button0, "class", "hideshowbtn svelte-wl7my9");
    			set_style(button0, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			add_location(button0, file$6, 1893, 32, 86914);
    			attr_dev(path3, "d", "M550 124c-7-24-25-42-49-49-42-11-213-11-213-11S117 64 75 75c-24 7-42 25-49 49-11 43-11 132-11 132s0 90 11 133c7 23 25 41 49 48 42 11 213 11 213 11s171 0 213-11c24-7 42-25 49-48 11-43 11-133 11-133s0-89-11-132zM232 338V175l143 81-143 82z");
    			add_location(path3, file$6, 1936, 40, 89367);
    			attr_dev(svg3, "viewBox", "0 0 576 512");
    			attr_dev(svg3, "class", "svelte-wl7my9");
    			add_location(svg3, file$6, 1935, 36, 89298);
    			attr_dev(button1, "class", "morevideos svelte-wl7my9");
    			set_style(button1, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			add_location(button1, file$6, 1924, 32, 88665);
    			attr_dev(path4, "fill", "#3a5a7e");
    			attr_dev(path4, "d", "M111 111V41c0-4-2-6-6-6H91c-4 0-6 2-6 6v5l32 91h31c4 0 6-2 6-6v-14c0-4-2-6-6-6h-37z");
    			add_location(path4, file$6, 1955, 40, 90623);
    			attr_dev(path5, "d", "M54 35 18 137h28l6-17h31l6 17h28L81 35H54zm5 62 9-29 9 29H59z");
    			add_location(path5, file$6, 1959, 40, 90907);
    			attr_dev(svg4, "viewBox", "0 0 172 172");
    			attr_dev(svg4, "class", "svelte-wl7my9");
    			add_location(svg4, file$6, 1954, 36, 90554);
    			attr_dev(button2, "class", "openanilist svelte-wl7my9");
    			set_style(button2, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			add_location(button2, file$6, 1941, 32, 89831);
    			attr_dev(div12, "class", "footer svelte-wl7my9");
    			add_location(div12, file$6, 1892, 28, 86860);
    			attr_dev(div13, "class", "popup-body svelte-wl7my9");
    			add_location(div13, file$6, 1501, 24, 61286);
    			attr_dev(div14, "class", "popup-main svelte-wl7my9");
    			add_location(div14, file$6, 1339, 20, 51504);
    			attr_dev(div15, "class", "popup-content svelte-wl7my9");
    			add_location(div15, file$6, 1338, 16, 51424);
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
    			input.checked = /*$autoPlay*/ ctx[10];
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
    					listen_dev(input, "change", /*input_change_handler*/ ctx[39]),
    					listen_dev(span0, "keydown", /*keydown_handler_1*/ ctx[40], false, false, false, false),
    					listen_dev(h30, "click", /*click_handler_1*/ ctx[41], false, false, false, false),
    					listen_dev(h30, "keydown", /*keydown_handler_2*/ ctx[42], false, false, false, false),
    					listen_dev(a0, "scroll", /*itemScroll*/ ctx[23], false, false, false, false),
    					listen_dev(div6, "scroll", /*itemScroll*/ ctx[23], false, false, false, false),
    					listen_dev(div7, "scroll", /*itemScroll*/ ctx[23], false, false, false, false),
    					listen_dev(div8, "scroll", /*itemScroll*/ ctx[23], false, false, false, false),
    					action_destroyer(addImage_action = /*addImage*/ ctx[32].call(null, img, /*anime*/ ctx[118].coverImageUrl || /*anime*/ ctx[118].bannerImageUrl || /*anime*/ ctx[118].trailerThumbnailUrl || emptyImage)),
    					listen_dev(img, "error", /*error_handler_1*/ ctx[49], false, false, false, false),
    					listen_dev(img, "click", click_handler_3, false, false, false, false),
    					listen_dev(img, "keydown", keydown_handler_5, false, false, false, false),
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*handleHideShow*/ ctx[17](/*anime*/ ctx[118].id, /*anime*/ ctx[118]?.shownTitle))) /*handleHideShow*/ ctx[17](/*anime*/ ctx[118].id, /*anime*/ ctx[118]?.shownTitle).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(button0, "keydown", keydown_handler_7, false, false, false, false),
    					listen_dev(
    						button1,
    						"click",
    						function () {
    							if (is_function(/*handleMoreVideos*/ ctx[19](/*anime*/ ctx[118].title))) /*handleMoreVideos*/ ctx[19](/*anime*/ ctx[118].title).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(button1, "keydown", keydown_handler_8, false, false, false, false),
    					listen_dev(button2, "click", click_handler_5, false, false, false, false),
    					listen_dev(button2, "keydown", keydown_handler_9, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*anime*/ ctx[118].trailerID) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_18(ctx);
    					if_block0.c();
    					if_block0.m(div2, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*anime*/ ctx[118].bannerImageUrl || /*anime*/ ctx[118].trailerThumbnailUrl) {
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

    			if (dirty[0] & /*$finalAnimeList*/ 512 && div2_class_value !== (div2_class_value = "" + (null_to_empty("popup-header " + (/*anime*/ ctx[118].trailerID ? "loader" : "")) + " svelte-wl7my9"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			if (each_value !== /*each_value*/ ctx[119] || anime_index !== /*anime_index*/ ctx[120]) {
    				unassign_div2();
    				each_value = /*each_value*/ ctx[119];
    				anime_index = /*anime_index*/ ctx[120];
    				assign_div2();
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && label0_for_value !== (label0_for_value = "auto-play-" + /*anime*/ ctx[118]?.id)) {
    				attr_dev(label0, "for", label0_for_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && input_id_value !== (input_id_value = "auto-play-" + /*anime*/ ctx[118]?.id)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty[0] & /*$autoPlay*/ 1024) {
    				input.checked = /*$autoPlay*/ ctx[10];
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block2) if_block2.d(1);
    				if_block2 = current_block_type && current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(h30, null);
    				}
    			}

    			if (/*$listUpdateAvailable*/ ctx[12]) {
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

    			if (/*anime*/ ctx[118].bannerImageUrl || /*anime*/ ctx[118].trailerThumbnailUrl) {
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

    			if (dirty[0] & /*$finalAnimeList*/ 512 && t10_value !== (t10_value = (/*anime*/ ctx[118]?.shownTitle || "NA") + "")) set_data_dev(t10, t10_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a0_rel_value !== (a0_rel_value = /*anime*/ ctx[118].animeUrl ? "noopener noreferrer" : "")) {
    				attr_dev(a0, "rel", a0_rel_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a0_target_value !== (a0_target_value = /*anime*/ ctx[118].animeUrl ? "_blank" : "")) {
    				attr_dev(a0, "target", a0_target_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a0_href_value !== (a0_href_value = /*anime*/ ctx[118].animeUrl || "javascript:void(0)")) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a0_class_value !== (a0_class_value = "" + (null_to_empty(/*anime*/ ctx[118]?.contentCautionColor + "-color anime-title copy") + " svelte-wl7my9"))) {
    				attr_dev(a0, "class", a0_class_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a0_copy_value_value !== (a0_copy_value_value = /*anime*/ ctx[118]?.copiedTitle || "")) {
    				attr_dev(a0, "copy-value", a0_copy_value_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a0_copy_value___value !== (a0_copy_value___value = /*anime*/ ctx[118]?.shownTitle || "")) {
    				attr_dev(a0, "copy-value-2", a0_copy_value___value);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 128) {
    				set_style(a0, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && t13_value !== (t13_value = (/*anime*/ ctx[118].averageScore != null
    			? /*anime*/ ctx[118].formattedAverageScore || "NA"
    			: "NA") + "")) set_data_dev(t13, t13_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && t15_value !== (t15_value = "/10 · " + (/*anime*/ ctx[118].popularity != null
    			? /*anime*/ ctx[118].formattedPopularity || "NA"
    			: "NA") + "")) set_data_dev(t15, t15_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && raw_value !== (raw_value = (/*anime*/ ctx[118]?.recommendedRatingInfo || "") + "")) html_tag.p(raw_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && h31_copy_value_value !== (h31_copy_value_value = (/*anime*/ ctx[118].averageScore != null
    			? /*anime*/ ctx[118].formattedAverageScore || "NA"
    			: "NA") + "/10 · " + (/*anime*/ ctx[118].popularity != null
    			? /*anime*/ ctx[118].formattedPopularity || "NA"
    			: "NA"))) {
    				attr_dev(h31, "copy-value", h31_copy_value_value);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 128) {
    				set_style(div6, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
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

    			if (dirty[0] & /*$popupIsGoingBack*/ 128) {
    				set_style(div7, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && t21_value !== (t21_value = (/*anime*/ ctx[118].userStatus || "NA") + "")) set_data_dev(t21, t21_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && span1_class_value !== (span1_class_value = "" + (null_to_empty(/*anime*/ ctx[118].userStatusColor + "-color") + " svelte-wl7my9"))) {
    				attr_dev(span1, "class", span1_class_value);
    			}

    			if (/*anime*/ ctx[118].userScore != null) {
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

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a1_rel_value !== (a1_rel_value = /*anime*/ ctx[118].animeUrl ? "noopener noreferrer" : "")) {
    				attr_dev(a1, "rel", a1_rel_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a1_target_value !== (a1_target_value = /*anime*/ ctx[118].animeUrl ? "_blank" : "")) {
    				attr_dev(a1, "target", a1_target_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && a1_href_value !== (a1_href_value = /*anime*/ ctx[118].animeUrl || "javascript:void(0)")) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && h40_copy_value_value !== (h40_copy_value_value = (/*anime*/ ctx[118].userStatus || "NA") + (/*anime*/ ctx[118].userScore != null
    			? " · " + /*anime*/ ctx[118].userScore
    			: ""))) {
    				attr_dev(h40, "copy-value", h40_copy_value_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && t24_value !== (t24_value = (/*anime*/ ctx[118].status || "NA") + "")) set_data_dev(t24, t24_value);

    			if (dirty[0] & /*$finalAnimeList*/ 512 && h41_copy_value_value !== (h41_copy_value_value = /*anime*/ ctx[118].status || "")) {
    				attr_dev(h41, "copy-value", h41_copy_value_value);
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 128) {
    				set_style(div8, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			}

    			if (/*anime*/ ctx[118].studios?.length) {
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

    			if (/*anime*/ ctx[118].genres.length) {
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

    			if (/*anime*/ ctx[118]?.tags?.length) {
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

    			if (dirty[0] & /*$finalAnimeList*/ 512 && img_alt_value !== (img_alt_value = (/*anime*/ ctx[118]?.shownTitle || "") + (/*anime*/ ctx[118].coverImageUrl
    			? " Cover"
    			: /*anime*/ ctx[118].bannerImageUrl
    				? " Banner"
    				: " Thumbnail"))) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty[0] & /*$finalAnimeList*/ 512 && img_class_value !== (img_class_value = "" + (null_to_empty("coverImg" + (!/*anime*/ ctx[118].coverImageUrl && !/*anime*/ ctx[118].bannerImageUrl && !/*anime*/ ctx[118].trailerThumbnailUrl
    			? " display-none"
    			: "")) + " svelte-wl7my9"))) {
    				attr_dev(img, "class", img_class_value);
    			}

    			if (addImage_action && is_function(addImage_action.update) && dirty[0] & /*$finalAnimeList*/ 512) addImage_action.update.call(null, /*anime*/ ctx[118].coverImageUrl || /*anime*/ ctx[118].bannerImageUrl || /*anime*/ ctx[118].trailerThumbnailUrl || emptyImage);

    			if (/*anime*/ ctx[118]?.description) {
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

    			if (each_value !== /*each_value*/ ctx[119] || anime_index !== /*anime_index*/ ctx[120]) {
    				unassign_div11();
    				each_value = /*each_value*/ ctx[119];
    				anime_index = /*anime_index*/ ctx[120];
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

    			if (dirty[0] & /*$popupIsGoingBack*/ 128) {
    				set_style(button0, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 128) {
    				set_style(button1, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			}

    			if (dirty[0] & /*$popupIsGoingBack*/ 128) {
    				set_style(button2, "overflow", /*$popupIsGoingBack*/ ctx[7] ? "hidden" : "");
    			}

    			if (each_value !== /*each_value*/ ctx[119] || anime_index !== /*anime_index*/ ctx[120]) {
    				unassign_div15();
    				each_value = /*each_value*/ ctx[119];
    				anime_index = /*anime_index*/ ctx[120];
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
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(1338:12) {#each $finalAnimeList || [] as anime (anime?.id || {}",
    		ctx
    	});

    	return block;
    }

    // (1970:12) {#if $finalAnimeList?.length && !$shownAllInList}
    function create_if_block_4$2(ctx) {
    	let div;
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M311 86a32 32 0 1 0-46-44L110 202l-46 47V64a32 32 0 1 0-64 0v384a32 32 0 1 0 64 0V341l65-67 133 192c10 15 30 18 44 8s18-30 8-44L174 227 311 86z");
    			add_location(path, file$6, 1975, 25, 91616);
    			attr_dev(svg, "class", "popup-content-loading-icon svelte-wl7my9");
    			attr_dev(svg, "viewBox", "0 0 320 512");
    			add_location(svg, file$6, 1972, 20, 91478);
    			attr_dev(div, "class", "popup-content-loading svelte-wl7my9");
    			add_location(div, file$6, 1970, 16, 91384);
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
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(1970:12) {#if $finalAnimeList?.length && !$shownAllInList}",
    		ctx
    	});

    	return block;
    }

    // (1985:0) {#if $popupVisible && $popupIsGoingBack}
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
    			add_location(path, file$6, 1996, 17, 92407);
    			attr_dev(svg, "viewBox", "0 0 320 512");
    			attr_dev(svg, "class", "svelte-wl7my9");
    			add_location(svg, file$6, 1995, 12, 92362);
    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty("go-back-grid" + (/*goBackPercent*/ ctx[6] >= 100 ? " willGoBack" : "")) + " svelte-wl7my9"));
    			add_location(div0, file$6, 1991, 8, 92218);
    			attr_dev(div1, "class", "go-back-grid-highlight svelte-wl7my9");
    			set_style(div1, "--scale", Math.max(1, (/*goBackPercent*/ ctx[6] ?? 1) * 0.01 * 2));
    			set_style(div1, "--position", "-" + (100 - (/*goBackPercent*/ ctx[6] ?? 0)) + "%");
    			add_location(div1, file$6, 1985, 4, 91980);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, svg);
    			append_dev(svg, path);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*goBackPercent*/ 64 && div0_class_value !== (div0_class_value = "" + (null_to_empty("go-back-grid" + (/*goBackPercent*/ ctx[6] >= 100 ? " willGoBack" : "")) + " svelte-wl7my9"))) {
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
    		source: "(1985:0) {#if $popupVisible && $popupIsGoingBack}",
    		ctx
    	});

    	return block;
    }

    // (2004:0) {#if fullDescriptionPopup}
    function create_if_block_1$5(ctx) {
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
    			attr_dev(div0, "class", "fullPopupDescription svelte-wl7my9");
    			add_location(div0, file$6, 2016, 16, 93198);
    			attr_dev(div1, "class", "fullPopupDescriptionWrapper svelte-wl7my9");
    			add_location(div1, file$6, 2015, 12, 93139);
    			attr_dev(div2, "class", "fullPopup svelte-wl7my9");
    			attr_dev(div2, "id", "fullPopup");
    			add_location(div2, file$6, 2014, 8, 93087);
    			attr_dev(div3, "class", "fullPopupWrapper svelte-wl7my9");
    			add_location(div3, file$6, 2004, 4, 92639);
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
    					listen_dev(div0, "keydown", /*keydown_handler_11*/ ctx[63], false, false, false, false),
    					listen_dev(div0, "scroll", /*fullViewScroll*/ ctx[28], false, false, false, false),
    					listen_dev(div3, "click", /*click_handler_6*/ ctx[64], false, false, false, false),
    					listen_dev(div3, "keydown", /*keydown_handler_12*/ ctx[65], false, false, false, false),
    					listen_dev(div3, "touchstart", /*fullViewTouchStart*/ ctx[29], { passive: true }, false, false, false),
    					listen_dev(div3, "touchend", /*fullViewTouchEnd*/ ctx[30], { passive: true }, false, false, false),
    					listen_dev(div3, "touchcancel", /*fullViewTouchCancel*/ ctx[31], { passive: true }, false, false, false)
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
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(2004:0) {#if fullDescriptionPopup}",
    		ctx
    	});

    	return block;
    }

    // (2032:0) {#if fullImagePopup}
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
    			attr_dev(img, "class", "fullPopupImage svelte-wl7my9");
    			attr_dev(img, "loading", "lazy");
    			attr_dev(img, "alt", "Full View");
    			add_location(img, file$6, 2043, 12, 94219);
    			attr_dev(div0, "class", "fullPopup svelte-wl7my9");
    			attr_dev(div0, "id", "fullPopup");
    			add_location(div0, file$6, 2042, 8, 94167);
    			attr_dev(div1, "class", "fullPopupWrapper svelte-wl7my9");
    			add_location(div1, file$6, 2032, 4, 93719);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(addImage_action = /*addImage*/ ctx[32].call(null, img, /*fullImagePopup*/ ctx[0] || emptyImage)),
    					listen_dev(img, "keydown", /*keydown_handler_13*/ ctx[66], false, false, false, false),
    					listen_dev(img, "error", /*error_handler_2*/ ctx[67], false, false, false, false),
    					listen_dev(div1, "click", /*click_handler_7*/ ctx[68], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_14*/ ctx[69], false, false, false, false),
    					listen_dev(div1, "touchstart", /*fullViewTouchStart*/ ctx[29], { passive: true }, false, false, false),
    					listen_dev(div1, "touchend", /*fullViewTouchEnd*/ ctx[30], { passive: true }, false, false, false),
    					listen_dev(div1, "touchcancel", /*fullViewTouchCancel*/ ctx[31], { passive: true }, false, false, false)
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
    		source: "(2032:0) {#if fullImagePopup}",
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
    	let if_block0 = /*$finalAnimeList*/ ctx[9]?.length && create_if_block_3$2(ctx);
    	let if_block1 = /*$popupVisible*/ ctx[8] && /*$popupIsGoingBack*/ ctx[7] && create_if_block_2$2(ctx);
    	let if_block2 = /*fullDescriptionPopup*/ ctx[1] && create_if_block_1$5(ctx);
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
    			attr_dev(div0, "class", "popup-container hide svelte-wl7my9");
    			add_location(div0, file$6, 1326, 4, 50927);
    			attr_dev(div1, "id", "popup-wrapper");
    			attr_dev(div1, "class", "popup-wrapper svelte-wl7my9");
    			add_location(div1, file$6, 1319, 0, 50724);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			if (if_block0) if_block0.m(div0, null);
    			/*div0_binding*/ ctx[60](div0);
    			/*div1_binding*/ ctx[62](div1);
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
    					listen_dev(div0, "touchstart", /*handlePopupContainerDown*/ ctx[24], { passive: true }, false, false, false),
    					listen_dev(div0, "touchmove", /*handlePopupContainerMove*/ ctx[25], { passive: true }, false, false, false),
    					listen_dev(div0, "touchend", /*handlePopupContainerUp*/ ctx[26], { passive: true }, false, false, false),
    					listen_dev(div0, "touchcancel", /*handlePopupContainerCancel*/ ctx[27], { passive: true }, false, false, false),
    					listen_dev(div0, "scroll", /*popupScroll*/ ctx[22], false, false, false, false),
    					listen_dev(div1, "click", /*handlePopupVisibility*/ ctx[16], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_10*/ ctx[61], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*$finalAnimeList*/ ctx[9]?.length) {
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

    			if (/*$popupVisible*/ ctx[8] && /*$popupIsGoingBack*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$popupVisible, $popupIsGoingBack*/ 384) {
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
    					if_block2 = create_if_block_1$5(ctx);
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
    			/*div0_binding*/ ctx[60](null);
    			/*div1_binding*/ ctx[62](null);
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

    function instance$6($$self, $$props, $$invalidate) {
    	let $isFullViewed;
    	let $android;
    	let $popupIsGoingBack;
    	let $popupVisible;
    	let $dataStatus;
    	let $ytPlayers;
    	let $updateRecommendationList;
    	let $finalAnimeList;
    	let $initData;
    	let $autoPlay;
    	let $inApp;
    	let $hiddenEntries;
    	let $searchedAnimeKeyword;
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
    	component_subscribe($$self, isFullViewed, $$value => $$invalidate(96, $isFullViewed = $$value));
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(33, $android = $$value));
    	validate_store(popupIsGoingBack, 'popupIsGoingBack');
    	component_subscribe($$self, popupIsGoingBack, $$value => $$invalidate(7, $popupIsGoingBack = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(8, $popupVisible = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(97, $dataStatus = $$value));
    	validate_store(ytPlayers, 'ytPlayers');
    	component_subscribe($$self, ytPlayers, $$value => $$invalidate(98, $ytPlayers = $$value));
    	validate_store(updateRecommendationList, 'updateRecommendationList');
    	component_subscribe($$self, updateRecommendationList, $$value => $$invalidate(99, $updateRecommendationList = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(9, $finalAnimeList = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(100, $initData = $$value));
    	validate_store(autoPlay, 'autoPlay');
    	component_subscribe($$self, autoPlay, $$value => $$invalidate(10, $autoPlay = $$value));
    	validate_store(inApp, 'inApp');
    	component_subscribe($$self, inApp, $$value => $$invalidate(101, $inApp = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(11, $hiddenEntries = $$value));
    	validate_store(searchedAnimeKeyword, 'searchedAnimeKeyword');
    	component_subscribe($$self, searchedAnimeKeyword, $$value => $$invalidate(102, $searchedAnimeKeyword = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(103, $animeLoaderWorker = $$value));
    	validate_store(listUpdateAvailable, 'listUpdateAvailable');
    	component_subscribe($$self, listUpdateAvailable, $$value => $$invalidate(12, $listUpdateAvailable = $$value));
    	validate_store(listIsUpdating, 'listIsUpdating');
    	component_subscribe($$self, listIsUpdating, $$value => $$invalidate(13, $listIsUpdating = $$value));
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(104, $confirmPromise = $$value));
    	validate_store(animeObserver, 'animeObserver');
    	component_subscribe($$self, animeObserver, $$value => $$invalidate(105, $animeObserver = $$value));
    	validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
    	component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(106, $openedAnimePopupIdx = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(107, $checkAnimeLoaderStatus = $$value));
    	validate_store(earlisetReleaseDate, 'earlisetReleaseDate');
    	component_subscribe($$self, earlisetReleaseDate, $$value => $$invalidate(14, $earlisetReleaseDate = $$value));
    	validate_store(shownAllInList, 'shownAllInList');
    	component_subscribe($$self, shownAllInList, $$value => $$invalidate(15, $shownAllInList = $$value));
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
    		windowWidth = Math.max(window.visualViewport.width, window.innerWidth),
    		windowHeight = Math.max(window.visualViewport.height, window.innerHeight),
    		videoLoops = {};

    	let savedYtVolume = !$android && matchMedia("(hover:hover)").matches
    	? 50
    	: 100;

    	(async () => {
    		savedYtVolume = await retrieveJSON("savedYtVolume") || savedYtVolume;
    	})();

    	function addPopupObserver() {
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
    		let isHidden = $hiddenEntries[animeID];

    		title = title
    		? `<span style="color:#00cbf9;">${title}</span>`
    		: "this anime";

    		if (isHidden) {
    			if (await $confirmPromise(`Are you sure you want to show ${title} in your recommendation list?`)) {
    				$checkAnimeLoaderStatus().then(() => {
    					delete $hiddenEntries[animeID];
    					hiddenEntries.set($hiddenEntries);

    					if ($finalAnimeList.length) {
    						if ($animeLoaderWorker instanceof Worker) {
    							$animeLoaderWorker?.postMessage?.({ removeID: animeID });
    						}
    					}
    				}).catch(() => {
    					$confirmPromise({
    						isAlert: true,
    						title: "Something went wrong",
    						text: "Showing anime has failed, please try again."
    					});
    				});
    			}
    		} else {
    			if (await $confirmPromise(`Are you sure you want to hide ${title} in your recommendation list?`)) {
    				$checkAnimeLoaderStatus().then(() => {
    					set_store_value(hiddenEntries, $hiddenEntries[animeID] = true, $hiddenEntries);

    					if ($finalAnimeList.length) {
    						if ($animeLoaderWorker instanceof Worker) {
    							$animeLoaderWorker?.postMessage?.({ removeID: animeID });
    						}
    					}
    				}).catch(() => {
    					$confirmPromise({
    						isAlert: true,
    						title: "Something went wrong",
    						text: "Hiding anime has failed, please try again."
    					});
    				});
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
    		if ($popupVisible && removedIdx != null && removedIdx >= 0) {
    			await tick();
    			let newPopupContent = popupContainer?.children?.[removedIdx];

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
    			$$invalidate(4, windowWidth = Math.max(window.visualViewport.width, window.innerWidth));
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

    	let updateListIconSpinningTimeout;

    	async function updateList(event) {
    		if (await $confirmPromise({
    			title: "List update is available",
    			text: "Are you sure you want to refresh the list?"
    		})) {
    			set_store_value(listIsUpdating, $listIsUpdating = true, $listIsUpdating);

    			if ($animeLoaderWorker) {
    				$animeLoaderWorker.terminate();
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
    			}

    			animeLoader().then(async data => {
    				set_store_value(listUpdateAvailable, $listUpdateAvailable = false, $listUpdateAvailable);
    				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);
    				set_store_value(searchedAnimeKeyword, $searchedAnimeKeyword = "", $searchedAnimeKeyword);

    				if (data?.isNew) {
    					set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
    					set_store_value(hiddenEntries, $hiddenEntries = data.hiddenEntries, $hiddenEntries);
    				}

    				set_store_value(dataStatus, $dataStatus = null, $dataStatus);
    				return;
    			}).catch(error => {
    				throw error;
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
    		itemIsScrolling = true;
    		clearTimeout(itemIsScrollingTimeout);

    		itemIsScrollingTimeout = setTimeout(
    			() => {
    				itemIsScrolling = false;
    			},
    			50
    		);

    		set_store_value(popupIsGoingBack, $popupIsGoingBack = false, $popupIsGoingBack);
    		$$invalidate(6, goBackPercent = 0);
    	}

    	function itemScroll() {
    		itemIsScrolling = true;
    		clearTimeout(itemIsScrollingTimeout);

    		itemIsScrollingTimeout = setTimeout(
    			() => {
    				itemIsScrolling = false;
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

    	const click_handler_3 = anime => {
    		window.setShouldGoBack(false);
    		$$invalidate(0, fullImagePopup = anime.coverImageUrl || anime.bannerImageUrl || anime.trailerThumbnailUrl || emptyImage);
    		$$invalidate(1, fullDescriptionPopup = null);
    	};

    	const keydown_handler_5 = (anime, e) => {
    		window.setShouldGoBack(false);

    		if (e.key === "Enter") {
    			$$invalidate(0, fullImagePopup = anime.coverImageUrl || anime.bannerImageUrl || anime.trailerThumbnailUrl || emptyImage);
    			$$invalidate(1, fullDescriptionPopup = null);
    		}
    	};

    	const click_handler_4 = anime => {
    		window.setShouldGoBack(false);
    		$$invalidate(1, fullDescriptionPopup = editHTMLString(anime?.description));
    		$$invalidate(0, fullImagePopup = null);
    	};

    	const keydown_handler_6 = (anime, e) => {
    		window.setShouldGoBack(false);

    		if (e.key === "Enter") {
    			$$invalidate(1, fullDescriptionPopup = editHTMLString(anime?.description));
    			$$invalidate(0, fullImagePopup = null);
    		}
    	};

    	function div11_binding($$value, each_value, anime_index) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			each_value[anime_index].popupInfo = $$value;
    		});
    	}

    	const keydown_handler_7 = (anime, e) => e.key === "Enter" && handleHideShow(anime.id, anime?.shownTitle);
    	const keydown_handler_8 = (anime, e) => e.key === "Enter" && handleMoreVideos(anime.title);

    	const click_handler_5 = anime => {
    		openInAnilist(anime.animeUrl);
    	};

    	const keydown_handler_9 = (anime, e) => e.key === "Enter" && openInAnilist(anime.animeUrl);

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

    	const keydown_handler_10 = e => e.key === "Enter" && handlePopupVisibility(e);

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			popupWrapper = $$value;
    			$$invalidate(2, popupWrapper);
    		});
    	}

    	const keydown_handler_11 = e => e.key === "Enter" && $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));
    	const click_handler_6 = () => $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));
    	const keydown_handler_12 = e => e.key === "Enter" && $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));
    	const keydown_handler_13 = e => e.key === "Enter" && $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));

    	const error_handler_2 = e => {
    		addClass(e.target, "display-none");
    	};

    	const click_handler_7 = () => $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));
    	const keydown_handler_14 = e => e.key === "Enter" && $$invalidate(1, fullDescriptionPopup = $$invalidate(0, fullImagePopup = null));

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
    		searchedAnimeKeyword,
    		checkAnimeLoaderStatus,
    		popupIsGoingBack,
    		earlisetReleaseDate,
    		listIsUpdating,
    		isFullViewed,
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
    		animeLoader,
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
    		updateListIconSpinningTimeout,
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
    		addImage,
    		$isFullViewed,
    		$android,
    		$popupIsGoingBack,
    		$popupVisible,
    		$dataStatus,
    		$ytPlayers,
    		$updateRecommendationList,
    		$finalAnimeList,
    		$initData,
    		$autoPlay,
    		$inApp,
    		$hiddenEntries,
    		$searchedAnimeKeyword,
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
    		if ('updateListIconSpinningTimeout' in $$props) updateListIconSpinningTimeout = $$props.updateListIconSpinningTimeout;
    		if ('isCurrentlyPlaying' in $$props) isCurrentlyPlaying = $$props.isCurrentlyPlaying;
    		if ('touchID' in $$props) touchID = $$props.touchID;
    		if ('checkPointer' in $$props) checkPointer = $$props.checkPointer;
    		if ('startX' in $$props) startX = $$props.startX;
    		if ('endX' in $$props) endX = $$props.endX;
    		if ('startY' in $$props) startY = $$props.startY;
    		if ('endY' in $$props) endY = $$props.endY;
    		if ('goBackPercent' in $$props) $$invalidate(6, goBackPercent = $$props.goBackPercent);
    		if ('itemIsScrolling' in $$props) itemIsScrolling = $$props.itemIsScrolling;
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
    		if ($$self.$$.dirty[0] & /*fullDescriptionPopup, fullImagePopup*/ 3 | $$self.$$.dirty[1] & /*$android*/ 4) {
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
    		mouseenter_handler_2,
    		error_handler_1,
    		click_handler_3,
    		keydown_handler_5,
    		click_handler_4,
    		keydown_handler_6,
    		div11_binding,
    		keydown_handler_7,
    		keydown_handler_8,
    		click_handler_5,
    		keydown_handler_9,
    		div15_binding,
    		div0_binding,
    		keydown_handler_10,
    		div1_binding,
    		keydown_handler_11,
    		click_handler_6,
    		keydown_handler_12,
    		keydown_handler_13,
    		error_handler_2,
    		click_handler_7,
    		keydown_handler_14
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

    // (188:0) {#if $animeOptionVisible && !$popupVisible && $finalAnimeList}
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

    	let t11_value = (/*$hiddenEntries*/ ctx[5][/*animeID*/ ctx[2]]
    	? "Show"
    	: "Hide") + " Anime" + "";

    	let t11;
    	let div2_outro;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*animeCopyTitle*/ ctx[1] && create_if_block_1$4(ctx);

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
    			attr_dev(h1, "class", "svelte-18z5knf");
    			add_location(h1, file$5, 197, 42, 7077);
    			attr_dev(span0, "class", "anime-title svelte-18z5knf");
    			add_location(span0, file$5, 197, 16, 7051);
    			attr_dev(div0, "class", "closing-x svelte-18z5knf");
    			attr_dev(div0, "tabindex", "0");
    			add_location(div0, file$5, 199, 16, 7195);
    			attr_dev(div1, "class", "option-header svelte-18z5knf");
    			add_location(div1, file$5, 196, 12, 7006);
    			attr_dev(h20, "class", "option-title svelte-18z5knf");
    			add_location(h20, file$5, 213, 17, 7736);
    			attr_dev(span1, "class", "anime-option svelte-18z5knf");
    			add_location(span1, file$5, 209, 12, 7555);
    			attr_dev(h21, "class", "option-title svelte-18z5knf");
    			add_location(h21, file$5, 219, 17, 7991);
    			attr_dev(span2, "class", "anime-option svelte-18z5knf");
    			add_location(span2, file$5, 215, 12, 7812);
    			attr_dev(h22, "class", "option-title svelte-18z5knf");
    			add_location(h22, file$5, 225, 17, 8250);
    			attr_dev(span3, "class", "anime-option svelte-18z5knf");
    			add_location(span3, file$5, 221, 12, 8071);
    			attr_dev(h23, "class", "option-title svelte-18z5knf");
    			add_location(h23, file$5, 239, 17, 8834);
    			attr_dev(span4, "class", "anime-option svelte-18z5knf");
    			add_location(span4, file$5, 235, 12, 8653);
    			attr_dev(div2, "class", "anime-options-container svelte-18z5knf");
    			add_location(div2, file$5, 195, 8, 6926);
    			attr_dev(div3, "class", "anime-options svelte-18z5knf");
    			add_location(div3, file$5, 188, 4, 6652);
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
    					if_block = create_if_block_1$4(ctx);
    					if_block.c();
    					if_block.m(div2, t10);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((!current || dirty[0] & /*$hiddenEntries, animeID*/ 36) && t11_value !== (t11_value = (/*$hiddenEntries*/ ctx[5][/*animeID*/ ctx[2]]
    			? "Show"
    			: "Hide") + " Anime" + "")) set_data_dev(t11, t11_value);
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
    		source: "(188:0) {#if $animeOptionVisible && !$popupVisible && $finalAnimeList}",
    		ctx
    	});

    	return block;
    }

    // (228:12) {#if animeCopyTitle}
    function create_if_block_1$4(ctx) {
    	let span;
    	let h2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element("span");
    			h2 = element("h2");
    			h2.textContent = "Copy Title";
    			attr_dev(h2, "class", "option-title svelte-18z5knf");
    			add_location(h2, file$5, 232, 21, 8555);
    			attr_dev(span, "class", "anime-option svelte-18z5knf");
    			add_location(span, file$5, 228, 16, 8368);
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
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(228:12) {#if animeCopyTitle}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $animeOptionVisible;
    	let $openedAnimeOptionIdx;
    	let $finalAnimeList;
    	let $confirmPromise;
    	let $animeLoaderWorker;
    	let $hiddenEntries;
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
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(29, $animeLoaderWorker = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(5, $hiddenEntries = $$value));
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
    		window.open(`https://www.youtube.com/results?search_query=${youtubeSearchTitle} Anime`, "_blank");
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

    		let title = shownTitle
    		? `<span style="color:#00cbf9;">${shownTitle}</span>`
    		: "this anime";

    		let isHidden = $hiddenEntries[animeID];

    		if (isHidden) {
    			if (await $confirmPromise(`Are you sure you want to show ${title} in your recommendation list?`)) {
    				$checkAnimeLoaderStatus().then(() => {
    					delete $hiddenEntries[animeID];
    					hiddenEntries.set($hiddenEntries);

    					if ($finalAnimeList.length) {
    						if ($animeLoaderWorker instanceof Worker) {
    							$animeLoaderWorker?.postMessage?.({ removeID: animeID });
    						}
    					}
    				}).catch(() => {
    					$confirmPromise({
    						isAlert: true,
    						title: "Something went wrong",
    						text: "Showing anime has failed, please try again."
    					});
    				});

    				set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    			}
    		} else {
    			if (await $confirmPromise(`Are you sure you want to hide ${title} in your recommendation list?`)) {
    				$checkAnimeLoaderStatus().then(() => {
    					set_store_value(hiddenEntries, $hiddenEntries[animeID] = true, $hiddenEntries);

    					if ($finalAnimeList.length) {
    						if ($animeLoaderWorker instanceof Worker) {
    							$animeLoaderWorker?.postMessage?.({ removeID: animeID });
    						}
    					}
    				}).catch(() => {
    					$confirmPromise({
    						isAlert: true,
    						title: "Something went wrong",
    						text: "Hiding anime has failed, please try again."
    					});
    				});

    				set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
    			}
    		}
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
    		loadAnimeOption,
    		$animeOptionVisible,
    		$openedAnimeOptionIdx,
    		$finalAnimeList,
    		$confirmPromise,
    		$animeLoaderWorker,
    		$hiddenEntries,
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {}, null, [-1, -1]);

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
    			attr_dev(path0, "class", "svelte-njo0m1");
    			add_location(path0, file$4, 323, 17, 12315);
    			attr_dev(svg0, "class", "goback svelte-njo0m1");
    			attr_dev(svg0, "tabindex", "0");
    			attr_dev(svg0, "viewBox", "0 0 448 512");
    			add_location(svg0, file$4, 318, 12, 12117);
    			attr_dev(div0, "class", "go-back-container svelte-njo0m1");
    			add_location(div0, file$4, 316, 8, 12015);
    			attr_dev(label, "class", "disable-interaction svelte-njo0m1");
    			attr_dev(label, "for", "usernameInput");
    			add_location(label, file$4, 329, 12, 12567);
    			attr_dev(input, "id", "usernameInput");
    			attr_dev(input, "type", "search");
    			attr_dev(input, "enterkeyhint", "search");
    			attr_dev(input, "autocomplete", "off");
    			attr_dev(input, "placeholder", "Your Anilist Username");
    			attr_dev(input, "class", "svelte-njo0m1");
    			add_location(input, file$4, 332, 12, 12692);
    			attr_dev(div1, "class", "" + (null_to_empty("usernameText") + " svelte-njo0m1"));
    			add_location(div1, file$4, 344, 12, 13191);
    			attr_dev(div2, "class", "input-search svelte-njo0m1");
    			add_location(div2, file$4, 328, 8, 12527);
    			attr_dev(path1, "d", "m144 7-2 2-1 1c-2 0-9 7-9 9l-2 2-1 1-1 2-3 5c-1 3-3 4-4 5l-1 3-1 1v1l-1 1-15 1-12 1c-11 1-12 1-18-4l-7-6-6-6-4-2s-2-1-2-3-3-2-3-2l-2-2-2-1-1-1-2-1-2-1-8-4c-3 0-7 5-6 6l-1 1v24a350 350 0 0 0 7 36c0 2-1 3-2 3v2l-1 1-3 7-1 2-3 9a61 61 0 0 0 4 30v2l2 3 3 7 1 1v1l1 2 1 1 1 1c0 1 0 2 2 3l2 4 2 2 2 2 6 7 5 7 1 1 1 1v3l4 10 1 14a75 75 0 0 0 2 19l1 4v2l2 3v2a205 205 0 0 0 15 29l1 1v1a128 128 0 0 1 11 22v1l1 1 1 1v3l1 2 2 5a480 480 0 0 1-2 93c0 1-4 6-6 6l-11 11-1 4c-2 3 0 7 8 14 1 1 2 2 1 3l1 3v1l1 2 1 2 3 3h3l1 1 4 1 2 1c0 1 16 2 19 1l2-1h2l7-5 1-1c2 0 11-10 12-13l1-2 1-1c-1-3 0-3 8-2l5 1 2 1-1 3-1 9 2 3 1 2 1 2 3 3 2 1 2 1 4 2 14 1a232 232 0 0 0 56-9l4-1 4-1h8l3 2h1l2 1a93 93 0 0 0 30-1l6-3 4-1 1-1 1-1h2l1-1 1-1 3-1 4-2h3l1-1h2l1-1h2l2-1h2l2-1h2l2-1 3-1h6c12-2 16-2 30-2a174 174 0 0 1 45 5l2 1h3l5 3 5 2 1 1 3 3 3 3 1 1 1 4c0 3-1 4-4 7l-4 3-1 1-8 4-5 2-8 2-5 2h-1l-2 1h-2l-3 1-1 1h-2l-3 1h-4l-10 2c-2 1-11 9-11 11-1 5 0 8 2 10l4 3 2 1 16 1 18-1 5-1 2-1h2l2-1h2l2-1h2l1-1h2l1-1 2-1h2l3-1 3-2h2l1-1 1-1c1 1 13-5 13-6h1l1-1 2-1 1-1h1l2-1 2-2 2-1 1-2c2 0 9-7 9-9l2-1 1-2v-1l1-1v-1l1-1v-1l1-2v-2c1-2 1-8-1-12v-1l-1-1-1-1c0-2-11-14-13-14l-2-2-2-2-2-1-5-3c-3-1-4-3-5-4l-3-1-1-1h-1l-1-1c0-1-4-3-5-2l-1-1h-1l-1-1-1-1-4-1-3-1-1-1h-1l-1-1h-2c-1 1-1 0-1-1h-2l-1-1-1-1h-2l-2-1h-2l-4-1-6-2-6-1-4-1-3-1-12-1a252 252 0 0 0-76 1v-2l1-3 1-5 1-2v-1l1-3 1-4 2-11 1-6c4-24 4-56 1-78l-1-5-1-3-1-7-1-2-1-3-1-5v-1l-1-1v-2l-1-1v-2l-1-2-1-3-1-2-1-3-1-1v-1l-1-1v-1l-1-1-2-4-3-5-1-1-1-2-1-1-1-2-1-1-1-3-2-1-9-11a68 68 0 0 0-15-12l-4-3-1-1-1-1-2-1-2-2-3-1-5-2-1-1h-1l-1-1-1-1-4-1-3-1-2-2h-3l-1-1h-2l-1-1h-2l-1-1h-2l-1-1-3-1h-3l-1-2-2-1-1-1-2-1h-1l-2-2-2-1-2-2c-1 0-10-9-10-11l-2-2-1-1-1-3a66 66 0 0 0-16-15l-1-1-2-1-1-1-3-1v-2l-1-1v-2l-1-1-1-2v-2l-2-3v-3l-1-1-1-1-4-9-2-2c-1-2-1-4 1-12a233 233 0 0 0 1-52v-2l-2-5c-2-3-3-3-6-3h-7z");
    			attr_dev(path1, "class", "svelte-njo0m1");
    			add_location(path1, file$4, 374, 16, 14289);
    			attr_dev(svg1, "viewBox", "0 0 500 500");
    			attr_dev(svg1, "class", "logo-icon svelte-njo0m1");
    			attr_dev(svg1, "aria-label", "Kanshi Logo");
    			attr_dev(svg1, "tabindex", "0");
    			add_location(svg1, file$4, 360, 12, 13778);
    			attr_dev(div3, "class", "logo-icon-container svelte-njo0m1");
    			add_location(div3, file$4, 353, 8, 13551);
    			attr_dev(nav, "id", "nav");

    			attr_dev(nav, "class", nav_class_value = "" + (null_to_empty("nav " + (/*$popupVisible*/ ctx[3] || /*$menuVisible*/ ctx[4]
    			? "popupvisible"
    			: /*inputUsernameEl*/ ctx[1] === document?.activeElement
    				? "inputfocused"
    				: "")) + " svelte-njo0m1"));

    			add_location(nav, file$4, 304, 4, 11595);
    			attr_dev(div4, "class", "nav-container svelte-njo0m1");
    			add_location(div4, file$4, 299, 0, 11448);
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
    				: "")) + " svelte-njo0m1"))) {
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
    		if (!classList.contains("nav") && !(classList.contains("logo-icon") || element.closest(".logo-icon"))) return;

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

    // (305:0) {#if $menuVisible}
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
    	let t11;
    	let button5;
    	let t13;
    	let t14;
    	let button6;
    	let div1_outro;
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
    			attr_dev(button0, "class", "button svelte-1y97dfa");
    			add_location(button0, file$3, 317, 12, 10459);
    			attr_dev(button1, "class", "button svelte-1y97dfa");
    			add_location(button1, file$3, 323, 12, 10676);
    			attr_dev(button2, "class", "button svelte-1y97dfa");
    			add_location(button2, file$3, 329, 12, 10925);
    			attr_dev(button3, "class", "button svelte-1y97dfa");
    			add_location(button3, file$3, 335, 12, 11142);
    			attr_dev(button4, "class", button4_class_value = "" + (null_to_empty("button " + (/*$autoUpdate*/ ctx[5] ? "selected" : "")) + " svelte-1y97dfa"));
    			add_location(button4, file$3, 352, 12, 11784);
    			attr_dev(button5, "class", "button svelte-1y97dfa");
    			add_location(button5, file$3, 368, 12, 12453);
    			attr_dev(button6, "class", "button svelte-1y97dfa");
    			add_location(button6, file$3, 405, 12, 14039);
    			attr_dev(div0, "class", "menu svelte-1y97dfa");
    			add_location(div0, file$3, 316, 8, 10427);
    			attr_dev(div1, "class", "menu-container svelte-1y97dfa");
    			add_location(div1, file$3, 305, 4, 10067);
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
    					listen_dev(div1, "click", /*click_handler*/ ctx[36], false, false, false, false),
    					listen_dev(div1, "touchend", /*handleMenuVisibility*/ ctx[12], { passive: true }, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_14*/ ctx[37], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*$android*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$1(ctx);
    					if_block0.c();
    					if_block0.m(div0, t8);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!current || dirty[0] & /*$autoUpdate*/ 32 && button4_class_value !== (button4_class_value = "" + (null_to_empty("button " + (/*$autoUpdate*/ ctx[5] ? "selected" : "")) + " svelte-1y97dfa"))) {
    				attr_dev(button4, "class", button4_class_value);
    			}

    			if (/*$android*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3$1(ctx);
    					if_block1.c();
    					if_block1.m(div0, t11);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*$android*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$3(ctx);
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
    		source: "(305:0) {#if $menuVisible}",
    		ctx
    	});

    	return block;
    }

    // (342:12) {#if $android}
    function create_if_block_4$1(ctx) {
    	let button;
    	let t_value = (/*$exportPathIsAvailable*/ ctx[4] ? "Change" : "Set") + " Export Folder" + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "button svelte-1y97dfa");
    			add_location(button, file$3, 342, 16, 11391);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", handleExportFolder, false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler_4*/ ctx[26], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$exportPathIsAvailable*/ 16 && t_value !== (t_value = (/*$exportPathIsAvailable*/ ctx[4] ? "Change" : "Set") + " Export Folder" + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(342:12) {#if $android}",
    		ctx
    	});

    	return block;
    }

    // (360:12) {#if $android}
    function create_if_block_3$1(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Auto Export");
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty("button " + (/*$autoExport*/ ctx[3] ? "selected" : "")) + " svelte-1y97dfa"));
    			add_location(button, file$3, 360, 16, 12113);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*handleExportEveryHour*/ ctx[11], false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler_6*/ ctx[28], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$autoExport*/ 8 && button_class_value !== (button_class_value = "" + (null_to_empty("button " + (/*$autoExport*/ ctx[3] ? "selected" : "")) + " svelte-1y97dfa"))) {
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
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(360:12) {#if $android}",
    		ctx
    	});

    	return block;
    }

    // (375:12) {#if $android}
    function create_if_block_1$3(ctx) {
    	let button0;
    	let t1;
    	let show_if = !window.location.protocol.startsWith("file:");
    	let t2;
    	let button1;
    	let t4;
    	let button2;
    	let t6;
    	let button3;
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
    			attr_dev(button0, "class", "button svelte-1y97dfa");
    			add_location(button0, file$3, 375, 16, 12722);
    			attr_dev(button1, "class", "button svelte-1y97dfa");
    			add_location(button1, file$3, 389, 16, 13367);
    			attr_dev(button2, "class", "button svelte-1y97dfa");
    			add_location(button2, file$3, 394, 16, 13596);
    			attr_dev(button3, "class", "button svelte-1y97dfa");
    			add_location(button3, file$3, 399, 16, 13815);
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(button2);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(button3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(375:12) {#if $android}",
    		ctx
    	});

    	return block;
    }

    // (382:16) {#if !window.location.protocol.startsWith("file:")}
    function create_if_block_2$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Check for Updates";
    			attr_dev(button, "class", "button svelte-1y97dfa");
    			add_location(button, file$3, 382, 20, 13064);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "keydown", /*keydown_handler_9*/ ctx[31], false, false, false, false),
    					listen_dev(button, "click", /*checkForUpdates*/ ctx[17], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
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
    			attr_dev(input, "id", "import-file");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".json");
    			set_style(input, "display", `none`);
    			add_location(input, file$3, 296, 0, 9881);
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
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(38, $confirmPromise = $$value));
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(1, $android = $$value));
    	validate_store(appID, 'appID');
    	component_subscribe($$self, appID, $$value => $$invalidate(39, $appID = $$value));
    	validate_store(activeTagFilters, 'activeTagFilters');
    	component_subscribe($$self, activeTagFilters, $$value => $$invalidate(40, $activeTagFilters = $$value));
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(41, $filterOptions = $$value));
    	validate_store(menuVisible, 'menuVisible');
    	component_subscribe($$self, menuVisible, $$value => $$invalidate(2, $menuVisible = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(42, $dataStatus = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(43, $finalAnimeList = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(44, $popupVisible = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(45, $animeLoaderWorker = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(46, $hiddenEntries = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(47, $initData = $$value));
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

    	const click_handler = e => {
    		if (e.pointerType !== "touch") {
    			handleMenuVisibility(e);
    		}
    	};

    	const keydown_handler_14 = e => e.key === "Enter" && handleMenuVisibility(e);

    	$$self.$capture_state = () => ({
    		appID,
    		android: android$1,
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
    		fade,
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

    const file$2 = "src\\components\\Others\\Search.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[106] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[109] = list[i];
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[127] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[112] = list[i];
    	child_ctx[113] = list;
    	child_ctx[114] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[115] = list[i];
    	child_ctx[117] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[118] = list[i];
    	child_ctx[119] = list;
    	child_ctx[120] = i;
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[121] = list[i];
    	child_ctx[122] = list;
    	child_ctx[123] = i;
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[124] = list[i];
    	child_ctx[126] = i;
    	return child_ctx;
    }

    function get_each_context_8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[112] = list[i];
    	return child_ctx;
    }

    // (1272:8) {:else}
    function create_else_block_7(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "skeleton shimmer svelte-1d2ae4n");
    			add_location(div, file$2, 1272, 12, 50964);
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
    		id: create_else_block_7.name,
    		type: "else",
    		source: "(1272:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1266:8) {#if $filterOptions}
    function create_if_block_17(ctx) {
    	let span;
    	let h2;
    	let t_value = (/*selectedFilterSelectionName*/ ctx[0] || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			h2 = element("h2");
    			t = text(t_value);
    			attr_dev(h2, "class", "svelte-1d2ae4n");
    			add_location(h2, file$2, 1267, 16, 50828);
    			attr_dev(span, "class", "svelte-1d2ae4n");
    			add_location(span, file$2, 1266, 12, 50804);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, h2);
    			append_dev(h2, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedFilterSelectionName*/ 1 && t_value !== (t_value = (/*selectedFilterSelectionName*/ ctx[0] || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_17.name,
    		type: "if",
    		source: "(1266:8) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (1275:8) {#if $dataStatus || !$username}
    function create_if_block_14(ctx) {
    	let span;
    	let h2;
    	let span_outro;
    	let current;

    	function select_block_type_1(ctx, dirty) {
    		if (/*$dataStatus*/ ctx[15]) return create_if_block_15;
    		if (!/*$username*/ ctx[17] && !/*$initData*/ ctx[14]) return create_if_block_16;
    		return create_else_block_6;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			h2 = element("h2");
    			if_block.c();
    			attr_dev(h2, "class", "svelte-1d2ae4n");
    			add_location(h2, file$2, 1276, 16, 51139);
    			attr_dev(span, "class", "data-status svelte-1d2ae4n");
    			add_location(span, file$2, 1275, 12, 51066);
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
    			span_outro = create_out_transition(span, fade, { duration: 200 });
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
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(1275:8) {#if $dataStatus || !$username}",
    		ctx
    	});

    	return block;
    }

    // (1282:20) {:else}
    function create_else_block_6(ctx) {
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
    		id: create_else_block_6.name,
    		type: "else",
    		source: "(1282:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1280:55) 
    function create_if_block_16(ctx) {
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
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(1280:55) ",
    		ctx
    	});

    	return block;
    }

    // (1278:20) {#if $dataStatus}
    function create_if_block_15(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(/*$dataStatus*/ ctx[15]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$dataStatus*/ 32768) set_data_dev(t, /*$dataStatus*/ ctx[15]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(1278:20) {#if $dataStatus}",
    		ctx
    	});

    	return block;
    }

    // (1324:16) {#if $filterOptions}
    function create_if_block_13(ctx) {
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
    	let each_value_8 = /*$filterOptions*/ ctx[1]?.filterSelection || [];
    	validate_each_argument(each_value_8);
    	const get_key = ctx => /*filterSelection*/ ctx[112]?.filterSelectionName || {};
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

    			attr_dev(h2, "class", "svelte-1d2ae4n");
    			add_location(h2, file$2, 1329, 28, 53491);
    			attr_dev(div0, "class", "closing-x svelte-1d2ae4n");

    			attr_dev(div0, "tabindex", div0_tabindex_value = /*selectedFilterTypeElement*/ ctx[5] && /*windowWidth*/ ctx[3] <= 425
    			? "0"
    			: "");

    			add_location(div0, file$2, 1331, 28, 53621);
    			attr_dev(div1, "class", "header svelte-1d2ae4n");
    			add_location(div1, file$2, 1328, 24, 53441);
    			attr_dev(div2, "class", "options svelte-1d2ae4n");
    			add_location(div2, file$2, 1345, 24, 54285);
    			attr_dev(div3, "class", div3_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedFilterTypeElement*/ ctx[5] ? "" : "hide")) + " svelte-1d2ae4n"));
    			add_location(div3, file$2, 1324, 20, 53254);
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
    					listen_dev(div0, "keydown", /*keydown_handler_1*/ ctx[48], false, false, false, false),
    					listen_dev(div0, "click", /*handleShowFilterTypes*/ ctx[21], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedFilterTypeElement, windowWidth*/ 40 && div0_tabindex_value !== (div0_tabindex_value = /*selectedFilterTypeElement*/ ctx[5] && /*windowWidth*/ ctx[3] <= 425
    			? "0"
    			: "")) {
    				attr_dev(div0, "tabindex", div0_tabindex_value);
    			}

    			if (dirty[0] & /*handleFilterTypes, $filterOptions*/ 1048578) {
    				each_value_8 = /*$filterOptions*/ ctx[1]?.filterSelection || [];
    				validate_each_argument(each_value_8);
    				validate_each_keys(ctx, each_value_8, get_each_context_8, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_8, each_1_lookup, div2, destroy_block, create_each_block_8, null, get_each_context_8);
    			}

    			if (dirty[0] & /*selectedFilterTypeElement*/ 32 && div3_class_value !== (div3_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedFilterTypeElement*/ ctx[5] ? "" : "hide")) + " svelte-1d2ae4n"))) {
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
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(1324:16) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (1347:28) {#each $filterOptions?.filterSelection || [] as filterSelection (filterSelection?.filterSelectionName || {}
    function create_each_block_8(key_1, ctx) {
    	let div;
    	let h3;
    	let t0_value = (/*filterSelection*/ ctx[112]?.filterSelectionName || "") + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function keydown_handler_2(...args) {
    		return /*keydown_handler_2*/ ctx[49](/*filterSelection*/ ctx[112], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(h3, "class", "svelte-1d2ae4n");

    			set_style(h3, "color", (/*filterSelection*/ ctx[112]?.isSelected)
    			? "#3db4f2"
    			: "inherit");

    			add_location(h3, file$2, 1358, 36, 55096);
    			attr_dev(div, "class", "option svelte-1d2ae4n");
    			add_location(div, file$2, 1347, 32, 54479);
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
    							if (is_function(/*handleFilterTypes*/ ctx[20](/*filterSelection*/ ctx[112]?.filterSelectionName))) /*handleFilterTypes*/ ctx[20](/*filterSelection*/ ctx[112]?.filterSelectionName).apply(this, arguments);
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
    			if (dirty[0] & /*$filterOptions*/ 2 && t0_value !== (t0_value = (/*filterSelection*/ ctx[112]?.filterSelectionName || "") + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$filterOptions*/ 2) {
    				set_style(h3, "color", (/*filterSelection*/ ctx[112]?.isSelected)
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
    		source: "(1347:28) {#each $filterOptions?.filterSelection || [] as filterSelection (filterSelection?.filterSelectionName || {}",
    		ctx
    	});

    	return block;
    }

    // (1733:8) {:else}
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
    		source: "(1733:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1409:8) {#if $filterOptions}
    function create_if_block_6(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let each_value_2 = /*$filterOptions*/ ctx[1]?.filterSelection || [];
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*filterSelection*/ ctx[112].filterSelectionName || {};
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
    			if (dirty[0] & /*$filterOptions, conditionalInputNumberList, showFilterOptions, handleInputNumber, handleCheckboxChange, $initData, Init, maxFilterSelectionHeight, handleFilterSelectOptionChange, closeFilterSelect, windowWidth, filterSelect*/ 130564382 | dirty[1] & /*pleaseWaitAlert*/ 32) {
    				each_value_2 = /*$filterOptions*/ ctx[1]?.filterSelection || [];
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
    		source: "(1409:8) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (1734:12) {#each Array(10) as _}
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
    			attr_dev(div0, "class", "filter-name skeleton shimmer svelte-1d2ae4n");
    			add_location(div0, file$2, 1735, 20, 76900);
    			attr_dev(div1, "class", "select skeleton shimmer svelte-1d2ae4n");
    			add_location(div1, file$2, 1736, 20, 76966);
    			attr_dev(div2, "class", "filter-select svelte-1d2ae4n");
    			add_location(div2, file$2, 1734, 16, 76851);
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
    		source: "(1734:12) {#each Array(10) as _}",
    		ctx
    	});

    	return block;
    }

    // (1478:28) {:else}
    function create_else_block_4(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M201 343c13 12 33 12 46 0l160-160a32 32 0 0 0-46-46L224 275 87 137a32 32 0 0 0-46 46l160 160z");
    			attr_dev(path, "class", "svelte-1d2ae4n");
    			add_location(path, file$2, 1480, 36, 61239);
    			attr_dev(svg, "class", "angle-down svelte-1d2ae4n");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file$2, 1478, 32, 61098);
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
    		source: "(1478:28) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1464:28) {#if Dropdown.selected && Dropdown.options.length && !Init}
    function create_if_block_12(ctx) {
    	let svg;
    	let path;
    	let mounted;
    	let dispose;

    	function keydown_handler_4(...args) {
    		return /*keydown_handler_4*/ ctx[52](/*dropdownIdx*/ ctx[123], ...args);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z");
    			attr_dev(path, "class", "svelte-1d2ae4n");
    			add_location(path, file$2, 1473, 36, 60803);
    			attr_dev(svg, "class", "angle-up svelte-1d2ae4n");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file$2, 1464, 32, 60288);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "keydown", keydown_handler_4, false, false, false, false),
    					listen_dev(
    						svg,
    						"click",
    						function () {
    							if (is_function(/*closeFilterSelect*/ ctx[23](/*dropdownIdx*/ ctx[123]))) /*closeFilterSelect*/ ctx[23](/*dropdownIdx*/ ctx[123]).apply(this, arguments);
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
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(1464:28) {#if Dropdown.selected && Dropdown.options.length && !Init}",
    		ctx
    	});

    	return block;
    }

    // (1610:36) {:else}
    function create_else_block_3(ctx) {
    	let div;
    	let h3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "No Results";
    			attr_dev(h3, "class", "svelte-1d2ae4n");
    			add_location(h3, file$2, 1611, 44, 70151);
    			attr_dev(div, "class", "option svelte-1d2ae4n");
    			add_location(div, file$2, 1610, 40, 70085);
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
    		source: "(1610:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1554:36) {#if Dropdown.options?.filter?.(({ optionName }) => hasPartialMatch(optionName, Dropdown?.optKeyword) || Dropdown?.optKeyword === "")?.length}
    function create_if_block_10(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let each_value_6 = /*Dropdown*/ ctx[121].options || [];
    	validate_each_argument(each_value_6);
    	const get_key = ctx => /*filterSelection*/ ctx[112].filterSelectionName + /*Dropdown*/ ctx[121].filName + /*option*/ ctx[124].optionName || {};
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
    			if (dirty[0] & /*$filterOptions, handleFilterSelectOptionChange*/ 16777218) {
    				each_value_6 = /*Dropdown*/ ctx[121].options || [];
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
    		source: "(1554:36) {#if Dropdown.options?.filter?.(({ optionName }) => hasPartialMatch(optionName, Dropdown?.optKeyword) || Dropdown?.optKeyword === \\\"\\\")?.length}",
    		ctx
    	});

    	return block;
    }

    // (1586:48) {#if option.selected === "included" || (option.selected === "excluded" && Dropdown.changeType !== "read")}
    function create_if_block_11(ctx) {
    	let svg;
    	let path;
    	let path_d_value;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");

    			attr_dev(path, "d", path_d_value = /*option*/ ctx[124].selected === "excluded" || /*filterSelection*/ ctx[112].filterSelectionName === "Content Caution"
    			? // circle-xmark
    				"M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-81-337c-9 9-9 25 0 34l47 47-47 47c-9 9-9 24 0 34s25 9 34 0l47-47 47 47c9 9 24 9 34 0s9-25 0-34l-47-47 47-47c9-10 9-25 0-34s-25-9-34 0l-47 47-47-47c-10-9-25-9-34 0z"
    			: // circle-check
    				"M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm113-303c9-9 9-25 0-34s-25-9-34 0L224 286l-47-47c-9-9-24-9-34 0s-9 25 0 34l64 64c10 9 25 9 34 0l128-128z");

    			attr_dev(path, "class", "svelte-1d2ae4n");
    			add_location(path, file$2, 1595, 56, 68604);
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "class", "svelte-1d2ae4n");

    			set_style(svg, "--optionColor", /*option*/ ctx[124].selected === "included"
    			? // green
    				"#5f9ea0"
    			: // red
    				"#e85d75");

    			add_location(svg, file$2, 1586, 52, 67953);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$filterOptions*/ 2 && path_d_value !== (path_d_value = /*option*/ ctx[124].selected === "excluded" || /*filterSelection*/ ctx[112].filterSelectionName === "Content Caution"
    			? // circle-xmark
    				"M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm-81-337c-9 9-9 25 0 34l47 47-47 47c-9 9-9 24 0 34s25 9 34 0l47-47 47 47c9 9 24 9 34 0s9-25 0-34l-47-47 47-47c9-10 9-25 0-34s-25-9-34 0l-47 47-47-47c-10-9-25-9-34 0z"
    			: // circle-check
    				"M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm113-303c9-9 9-25 0-34s-25-9-34 0L224 286l-47-47c-9-9-24-9-34 0s-9 25 0 34l64 64c10 9 25 9 34 0l128-128z")) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2) {
    				set_style(svg, "--optionColor", /*option*/ ctx[124].selected === "included"
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
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(1586:48) {#if option.selected === \\\"included\\\" || (option.selected === \\\"excluded\\\" && Dropdown.changeType !== \\\"read\\\")}",
    		ctx
    	});

    	return block;
    }

    // (1555:40) {#each Dropdown.options || [] as option, optionIdx (filterSelection.filterSelectionName + Dropdown.filName + option.optionName || {}
    function create_each_block_6(key_1, ctx) {
    	let div;
    	let h3;
    	let t0_value = (/*option*/ ctx[124].optionName || "") + "";
    	let t0;
    	let t1;
    	let div_class_value;
    	let mounted;
    	let dispose;
    	let if_block = (/*option*/ ctx[124].selected === "included" || /*option*/ ctx[124].selected === "excluded" && /*Dropdown*/ ctx[121].changeType !== "read") && create_if_block_11(ctx);

    	function keydown_handler_7(...args) {
    		return /*keydown_handler_7*/ ctx[57](/*option*/ ctx[124], /*Dropdown*/ ctx[121], /*optionIdx*/ ctx[126], /*dropdownIdx*/ ctx[123], /*filterSelection*/ ctx[112], ...args);
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
    			attr_dev(h3, "class", "svelte-1d2ae4n");
    			add_location(h3, file$2, 1582, 48, 67605);

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty("option " + (hasPartialMatch(/*option*/ ctx[124].optionName, /*Dropdown*/ ctx[121].optKeyword)
    			? ""
    			: "disable-interaction")) + " svelte-1d2ae4n"));

    			add_location(div, file$2, 1555, 44, 65690);
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
    							if (is_function(/*handleFilterSelectOptionChange*/ ctx[24](/*option*/ ctx[124].optionName, /*Dropdown*/ ctx[121].filName, /*optionIdx*/ ctx[126], /*dropdownIdx*/ ctx[123], /*Dropdown*/ ctx[121].changeType, /*filterSelection*/ ctx[112].filterSelectionName))) /*handleFilterSelectOptionChange*/ ctx[24](/*option*/ ctx[124].optionName, /*Dropdown*/ ctx[121].filName, /*optionIdx*/ ctx[126], /*dropdownIdx*/ ctx[123], /*Dropdown*/ ctx[121].changeType, /*filterSelection*/ ctx[112].filterSelectionName).apply(this, arguments);
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
    			if (dirty[0] & /*$filterOptions*/ 2 && t0_value !== (t0_value = (/*option*/ ctx[124].optionName || "") + "")) set_data_dev(t0, t0_value);

    			if (/*option*/ ctx[124].selected === "included" || /*option*/ ctx[124].selected === "excluded" && /*Dropdown*/ ctx[121].changeType !== "read") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_11(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && div_class_value !== (div_class_value = "" + (null_to_empty("option " + (hasPartialMatch(/*option*/ ctx[124].optionName, /*Dropdown*/ ctx[121].optKeyword)
    			? ""
    			: "disable-interaction")) + " svelte-1d2ae4n"))) {
    				attr_dev(div, "class", div_class_value);
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
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(1555:40) {#each Dropdown.options || [] as option, optionIdx (filterSelection.filterSelectionName + Dropdown.filName + option.optionName || {}",
    		ctx
    	});

    	return block;
    }

    // (1411:16) {#each filterSelection.filters.Dropdown || [] as Dropdown, dropdownIdx (filterSelection.filterSelectionName + Dropdown.filName || {}
    function create_each_block_5(key_1, ctx) {
    	let div8;
    	let div0;
    	let h20;
    	let t0_value = (/*Dropdown*/ ctx[121].filName || "") + "";
    	let t0;
    	let t1;
    	let div2;
    	let div1;
    	let label0;
    	let t2_value = /*filterSelection*/ ctx[112].filterSelectionName + " " + /*Dropdown*/ ctx[121].filName + "";
    	let t2;
    	let label0_for_value;
    	let t3;
    	let input0;
    	let input0_id_value;
    	let input0_disabled_value;
    	let t4;
    	let div2_tabindex_value;
    	let t5;
    	let div7;
    	let div6;
    	let div4;
    	let h21;
    	let t6_value = /*Dropdown*/ ctx[121].filName + "";
    	let t6;
    	let t7;
    	let div3;
    	let t8;
    	let div3_tabindex_value;
    	let t9;
    	let label1;
    	let t10_value = "Search " + /*filterSelection*/ ctx[112].filterSelectionName + " " + /*Dropdown*/ ctx[121].filName + "";
    	let t10;
    	let label1_for_value;
    	let t11;
    	let input1;
    	let input1_id_value;
    	let input1_disabled_value;
    	let t12;
    	let div5;
    	let show_if;
    	let div6_class_value;
    	let div7_class_value;
    	let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[4]}px`;
    	let div8_class_value;
    	let mounted;
    	let dispose;

    	function func(...args) {
    		return /*func*/ ctx[45](/*Dropdown*/ ctx[121], ...args);
    	}

    	function input0_input_handler() {
    		/*input0_input_handler*/ ctx[51].call(input0, /*filSelIdx*/ ctx[114], /*dropdownIdx*/ ctx[123]);
    	}

    	function select_block_type_3(ctx, dirty) {
    		if (/*Dropdown*/ ctx[121].selected && /*Dropdown*/ ctx[121].options.length && !/*Init*/ ctx[2]) return create_if_block_12;
    		return create_else_block_4;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block0 = current_block_type(ctx);

    	function keydown_handler_5(...args) {
    		return /*keydown_handler_5*/ ctx[53](/*dropdownIdx*/ ctx[123], ...args);
    	}

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[54](/*dropdownIdx*/ ctx[123], ...args);
    	}

    	function keydown_handler_6(...args) {
    		return /*keydown_handler_6*/ ctx[55](/*dropdownIdx*/ ctx[123], ...args);
    	}

    	function input1_input_handler() {
    		/*input1_input_handler*/ ctx[56].call(input1, /*filSelIdx*/ ctx[114], /*dropdownIdx*/ ctx[123]);
    	}

    	function select_block_type_4(ctx, dirty) {
    		if (dirty[0] & /*$filterOptions*/ 2) show_if = null;
    		if (show_if == null) show_if = !!/*Dropdown*/ ctx[121].options?.filter?.(func)?.length;
    		if (show_if) return create_if_block_10;
    		return create_else_block_3;
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
    			attr_dev(h20, "class", "svelte-1d2ae4n");
    			add_location(h20, file$2, 1418, 28, 57740);
    			attr_dev(div0, "class", "filter-name svelte-1d2ae4n");
    			add_location(div0, file$2, 1417, 24, 57685);
    			attr_dev(label0, "class", "disable-interaction svelte-1d2ae4n");
    			attr_dev(label0, "for", label0_for_value = /*filterSelection*/ ctx[112].filterSelectionName + /*Dropdown*/ ctx[121].filName);
    			add_location(label0, file$2, 1438, 32, 58751);
    			attr_dev(input0, "id", input0_id_value = /*filterSelection*/ ctx[112].filterSelectionName + /*Dropdown*/ ctx[121].filName);
    			attr_dev(input0, "placeholder", "Any");
    			attr_dev(input0, "type", "search");
    			attr_dev(input0, "enterkeyhint", "search");
    			attr_dev(input0, "autocomplete", "off");
    			attr_dev(input0, "class", "" + (null_to_empty("value-input") + " svelte-1d2ae4n"));
    			input0.disabled = input0_disabled_value = !/*showFilterOptions*/ ctx[8] || /*windowWidth*/ ctx[3] <= 425 || !/*filterSelection*/ ctx[112].isSelected;
    			add_location(input0, file$2, 1447, 32, 59254);
    			attr_dev(div1, "class", "value-wrap svelte-1d2ae4n");
    			add_location(div1, file$2, 1437, 28, 58693);
    			attr_dev(div2, "class", "select svelte-1d2ae4n");

    			attr_dev(div2, "tabindex", div2_tabindex_value = /*showFilterOptions*/ ctx[8] && /*windowWidth*/ ctx[3] <= 425 && /*filterSelection*/ ctx[112].isSelected
    			? "0"
    			: "");

    			add_location(div2, file$2, 1421, 24, 57911);
    			attr_dev(h21, "class", "svelte-1d2ae4n");
    			add_location(h21, file$2, 1505, 36, 62572);
    			attr_dev(div3, "class", "closing-x svelte-1d2ae4n");

    			attr_dev(div3, "tabindex", div3_tabindex_value = /*showFilterOptions*/ ctx[8] && /*Dropdown*/ ctx[121].selected
    			? "0"
    			: "");

    			add_location(div3, file$2, 1507, 36, 62729);
    			attr_dev(div4, "class", "header svelte-1d2ae4n");
    			add_location(div4, file$2, 1504, 32, 62514);
    			attr_dev(label1, "class", "disable-interaction svelte-1d2ae4n");
    			attr_dev(label1, "for", label1_for_value = "Search " + (/*filterSelection*/ ctx[112].filterSelectionName + /*Dropdown*/ ctx[121].filName));
    			add_location(label1, file$2, 1523, 32, 63599);
    			attr_dev(input1, "id", input1_id_value = "Search " + (/*filterSelection*/ ctx[112].filterSelectionName + /*Dropdown*/ ctx[121].filName));
    			attr_dev(input1, "placeholder", "Any");
    			attr_dev(input1, "type", "search");
    			attr_dev(input1, "enterkeyhint", "search");
    			attr_dev(input1, "autocomplete", "off");
    			input1.disabled = input1_disabled_value = !/*showFilterOptions*/ ctx[8] || !/*filterSelection*/ ctx[112].isSelected || !/*Dropdown*/ ctx[121].selected;
    			attr_dev(input1, "class", "svelte-1d2ae4n");
    			add_location(input1, file$2, 1534, 32, 64214);
    			attr_dev(div5, "class", "options svelte-1d2ae4n");
    			add_location(div5, file$2, 1549, 32, 65123);

    			attr_dev(div6, "class", div6_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*Dropdown*/ ctx[121].options.length && /*Dropdown*/ ctx[121].selected === true && !/*Init*/ ctx[2]
    			? ""
    			: "hide")) + " svelte-1d2ae4n"));

    			add_location(div6, file$2, 1496, 28, 62102);

    			attr_dev(div7, "class", div7_class_value = "" + (null_to_empty("options-wrap " + (/*Dropdown*/ ctx[121].options.length && /*Dropdown*/ ctx[121].selected === true && !/*Init*/ ctx[2]
    			? ""
    			: "disable-interaction hide")) + " svelte-1d2ae4n"));

    			set_style(div7, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			add_location(div7, file$2, 1486, 24, 61556);

    			attr_dev(div8, "class", div8_class_value = "" + (null_to_empty("filter-select " + (/*filterSelection*/ ctx[112].isSelected
    			? ""
    			: "disable-interaction")) + " svelte-1d2ae4n"));

    			add_location(div8, file$2, 1411, 20, 57427);
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
    			set_input_value(input0, /*$filterOptions*/ ctx[1].filterSelection[/*filSelIdx*/ ctx[114]].filters.Dropdown[/*dropdownIdx*/ ctx[123]].optKeyword);
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
    			set_input_value(input1, /*$filterOptions*/ ctx[1].filterSelection[/*filSelIdx*/ ctx[114]].filters.Dropdown[/*dropdownIdx*/ ctx[123]].optKeyword);
    			append_dev(div6, t12);
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
    							if (is_function(/*closeFilterSelect*/ ctx[23](/*dropdownIdx*/ ctx[123]))) /*closeFilterSelect*/ ctx[23](/*dropdownIdx*/ ctx[123]).apply(this, arguments);
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
    			if (dirty[0] & /*$filterOptions*/ 2 && t0_value !== (t0_value = (/*Dropdown*/ ctx[121].filName || "") + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*$filterOptions*/ 2 && t2_value !== (t2_value = /*filterSelection*/ ctx[112].filterSelectionName + " " + /*Dropdown*/ ctx[121].filName + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*$filterOptions*/ 2 && label0_for_value !== (label0_for_value = /*filterSelection*/ ctx[112].filterSelectionName + /*Dropdown*/ ctx[121].filName)) {
    				attr_dev(label0, "for", label0_for_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && input0_id_value !== (input0_id_value = /*filterSelection*/ ctx[112].filterSelectionName + /*Dropdown*/ ctx[121].filName)) {
    				attr_dev(input0, "id", input0_id_value);
    			}

    			if (dirty[0] & /*showFilterOptions, windowWidth, $filterOptions*/ 266 && input0_disabled_value !== (input0_disabled_value = !/*showFilterOptions*/ ctx[8] || /*windowWidth*/ ctx[3] <= 425 || !/*filterSelection*/ ctx[112].isSelected)) {
    				prop_dev(input0, "disabled", input0_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && input0.value !== /*$filterOptions*/ ctx[1].filterSelection[/*filSelIdx*/ ctx[114]].filters.Dropdown[/*dropdownIdx*/ ctx[123]].optKeyword) {
    				set_input_value(input0, /*$filterOptions*/ ctx[1].filterSelection[/*filSelIdx*/ ctx[114]].filters.Dropdown[/*dropdownIdx*/ ctx[123]].optKeyword);
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

    			if (dirty[0] & /*showFilterOptions, windowWidth, $filterOptions*/ 266 && div2_tabindex_value !== (div2_tabindex_value = /*showFilterOptions*/ ctx[8] && /*windowWidth*/ ctx[3] <= 425 && /*filterSelection*/ ctx[112].isSelected
    			? "0"
    			: "")) {
    				attr_dev(div2, "tabindex", div2_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && t6_value !== (t6_value = /*Dropdown*/ ctx[121].filName + "")) set_data_dev(t6, t6_value);

    			if (dirty[0] & /*showFilterOptions, $filterOptions*/ 258 && div3_tabindex_value !== (div3_tabindex_value = /*showFilterOptions*/ ctx[8] && /*Dropdown*/ ctx[121].selected
    			? "0"
    			: "")) {
    				attr_dev(div3, "tabindex", div3_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && t10_value !== (t10_value = "Search " + /*filterSelection*/ ctx[112].filterSelectionName + " " + /*Dropdown*/ ctx[121].filName + "")) set_data_dev(t10, t10_value);

    			if (dirty[0] & /*$filterOptions*/ 2 && label1_for_value !== (label1_for_value = "Search " + (/*filterSelection*/ ctx[112].filterSelectionName + /*Dropdown*/ ctx[121].filName))) {
    				attr_dev(label1, "for", label1_for_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && input1_id_value !== (input1_id_value = "Search " + (/*filterSelection*/ ctx[112].filterSelectionName + /*Dropdown*/ ctx[121].filName))) {
    				attr_dev(input1, "id", input1_id_value);
    			}

    			if (dirty[0] & /*showFilterOptions, $filterOptions*/ 258 && input1_disabled_value !== (input1_disabled_value = !/*showFilterOptions*/ ctx[8] || !/*filterSelection*/ ctx[112].isSelected || !/*Dropdown*/ ctx[121].selected)) {
    				prop_dev(input1, "disabled", input1_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && input1.value !== /*$filterOptions*/ ctx[1].filterSelection[/*filSelIdx*/ ctx[114]].filters.Dropdown[/*dropdownIdx*/ ctx[123]].optKeyword) {
    				set_input_value(input1, /*$filterOptions*/ ctx[1].filterSelection[/*filSelIdx*/ ctx[114]].filters.Dropdown[/*dropdownIdx*/ ctx[123]].optKeyword);
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

    			if (dirty[0] & /*$filterOptions, Init*/ 6 && div6_class_value !== (div6_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*Dropdown*/ ctx[121].options.length && /*Dropdown*/ ctx[121].selected === true && !/*Init*/ ctx[2]
    			? ""
    			: "hide")) + " svelte-1d2ae4n"))) {
    				attr_dev(div6, "class", div6_class_value);
    			}

    			if (dirty[0] & /*$filterOptions, Init*/ 6 && div7_class_value !== (div7_class_value = "" + (null_to_empty("options-wrap " + (/*Dropdown*/ ctx[121].options.length && /*Dropdown*/ ctx[121].selected === true && !/*Init*/ ctx[2]
    			? ""
    			: "disable-interaction hide")) + " svelte-1d2ae4n"))) {
    				attr_dev(div7, "class", div7_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 16 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[4]}px`)) {
    				set_style(div7, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && div8_class_value !== (div8_class_value = "" + (null_to_empty("filter-select " + (/*filterSelection*/ ctx[112].isSelected
    			? ""
    			: "disable-interaction")) + " svelte-1d2ae4n"))) {
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
    		source: "(1411:16) {#each filterSelection.filters.Dropdown || [] as Dropdown, dropdownIdx (filterSelection.filterSelectionName + Dropdown.filName || {}",
    		ctx
    	});

    	return block;
    }

    // (1621:20) {#if filterSelection.isSelected}
    function create_if_block_8(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div2;
    	let label;
    	let t1_value = /*Checkbox*/ ctx[118].filName + "";
    	let t1;
    	let label_for_value;
    	let t2;
    	let t3;
    	let div1;
    	let t4_value = (/*Checkbox*/ ctx[118].filName || "") + "";
    	let t4;
    	let mounted;
    	let dispose;

    	function select_block_type_5(ctx, dirty) {
    		if (/*$initData*/ ctx[14]) return create_if_block_9;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_5(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[61](/*Checkbox*/ ctx[118], /*checkboxIdx*/ ctx[120], /*filterSelection*/ ctx[112], ...args);
    	}

    	function keydown_handler_8(...args) {
    		return /*keydown_handler_8*/ ctx[62](/*Checkbox*/ ctx[118], /*checkboxIdx*/ ctx[120], /*filterSelection*/ ctx[112], ...args);
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
    			if_block.c();
    			t3 = space();
    			div1 = element("div");
    			t4 = text(t4_value);
    			attr_dev(div0, "class", "svelte-1d2ae4n");
    			set_style(div0, "visibility", `none`);
    			add_location(div0, file$2, 1622, 28, 70713);
    			attr_dev(label, "class", "disable-interaction svelte-1d2ae4n");
    			attr_dev(label, "for", label_for_value = "Checkbox: " + /*Checkbox*/ ctx[118].filName);
    			add_location(label, file$2, 1641, 32, 71724);
    			attr_dev(div1, "class", "checkbox-label svelte-1d2ae4n");
    			add_location(div1, file$2, 1675, 32, 73689);
    			attr_dev(div2, "class", "checkbox-wrap svelte-1d2ae4n");
    			add_location(div2, file$2, 1623, 28, 70774);
    			attr_dev(div3, "class", "filter-checkbox svelte-1d2ae4n");
    			add_location(div3, file$2, 1621, 24, 70654);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, label);
    			append_dev(label, t1);
    			append_dev(div2, t2);
    			if_block.m(div2, null);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, t4);

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
    			if (dirty[0] & /*$filterOptions*/ 2 && t1_value !== (t1_value = /*Checkbox*/ ctx[118].filName + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*$filterOptions*/ 2 && label_for_value !== (label_for_value = "Checkbox: " + /*Checkbox*/ ctx[118].filName)) {
    				attr_dev(label, "for", label_for_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type_5(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div2, t3);
    				}
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && t4_value !== (t4_value = (/*Checkbox*/ ctx[118].filName || "") + "")) set_data_dev(t4, t4_value);
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
    		source: "(1621:20) {#if filterSelection.isSelected}",
    		ctx
    	});

    	return block;
    }

    // (1660:32) {:else}
    function create_else_block_2(ctx) {
    	let input;
    	let input_id_value;
    	let input_disabled_value;
    	let mounted;
    	let dispose;

    	function change_handler_1(...args) {
    		return /*change_handler_1*/ ctx[59](/*Checkbox*/ ctx[118], /*checkboxIdx*/ ctx[120], /*filterSelection*/ ctx[112], ...args);
    	}

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[60].call(input, /*each_value_4*/ ctx[119], /*checkboxIdx*/ ctx[120]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "id", input_id_value = "Checkbox: " + /*Checkbox*/ ctx[118].filName);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "checkbox svelte-1d2ae4n");
    			input.disabled = input_disabled_value = !/*showFilterOptions*/ ctx[8];
    			add_location(input, file$2, 1660, 36, 72790);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			input.checked = /*Checkbox*/ ctx[118].isSelected;

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

    			if (dirty[0] & /*$filterOptions*/ 2 && input_id_value !== (input_id_value = "Checkbox: " + /*Checkbox*/ ctx[118].filName)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty[0] & /*showFilterOptions*/ 256 && input_disabled_value !== (input_disabled_value = !/*showFilterOptions*/ ctx[8])) {
    				prop_dev(input, "disabled", input_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2) {
    				input.checked = /*Checkbox*/ ctx[118].isSelected;
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
    		source: "(1660:32) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1648:32) {#if $initData}
    function create_if_block_9(ctx) {
    	let input;
    	let input_id_value;
    	let input_checked_value;
    	let input_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "id", input_id_value = "Checkbox: " + /*Checkbox*/ ctx[118].filName);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "class", "checkbox svelte-1d2ae4n");
    			input.checked = input_checked_value = /*Checkbox*/ ctx[118].isSelected;
    			input.disabled = input_disabled_value = !/*showFilterOptions*/ ctx[8];
    			add_location(input, file$2, 1648, 36, 72090);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*change_handler*/ ctx[58], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$filterOptions*/ 2 && input_id_value !== (input_id_value = "Checkbox: " + /*Checkbox*/ ctx[118].filName)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && input_checked_value !== (input_checked_value = /*Checkbox*/ ctx[118].isSelected)) {
    				prop_dev(input, "checked", input_checked_value);
    			}

    			if (dirty[0] & /*showFilterOptions*/ 256 && input_disabled_value !== (input_disabled_value = !/*showFilterOptions*/ ctx[8])) {
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
    		source: "(1648:32) {#if $initData}",
    		ctx
    	});

    	return block;
    }

    // (1620:16) {#each filterSelection.filters.Checkbox || [] as Checkbox, checkboxIdx (filterSelection.filterSelectionName + Checkbox.filName || {}
    function create_each_block_4(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = /*filterSelection*/ ctx[112].isSelected && create_if_block_8(ctx);

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

    			if (/*filterSelection*/ ctx[112].isSelected) {
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
    		source: "(1620:16) {#each filterSelection.filters.Checkbox || [] as Checkbox, checkboxIdx (filterSelection.filterSelectionName + Checkbox.filName || {}",
    		ctx
    	});

    	return block;
    }

    // (1684:20) {#if filterSelection.isSelected}
    function create_if_block_7(ctx) {
    	let div2;
    	let div0;
    	let h2;
    	let t0_value = (/*inputNum*/ ctx[115].filName || "") + "";
    	let t0;
    	let t1;
    	let div1;
    	let label;
    	let t2_value = "Number Filter: " + /*inputNum*/ ctx[115].filName + "";
    	let t2;
    	let label_for_value;
    	let t3;
    	let input;
    	let input_id_value;
    	let input_placeholder_value;
    	let input_value_value;
    	let input_disabled_value;
    	let t4;
    	let mounted;
    	let dispose;

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[63](/*inputNumIdx*/ ctx[117], /*inputNum*/ ctx[115], /*filterSelection*/ ctx[112], ...args);
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
    			attr_dev(h2, "class", "svelte-1d2ae4n");
    			add_location(h2, file$2, 1691, 32, 74520);
    			attr_dev(div0, "class", "filter-input-number-name svelte-1d2ae4n");
    			add_location(div0, file$2, 1690, 28, 74448);
    			attr_dev(label, "class", "disable-interaction svelte-1d2ae4n");
    			attr_dev(label, "for", label_for_value = "Number Filter: " + /*inputNum*/ ctx[115].filName);
    			add_location(label, file$2, 1694, 32, 74690);
    			attr_dev(input, "id", input_id_value = "Number Filter: " + /*inputNum*/ ctx[115].filName);
    			attr_dev(input, "class", "value-input-number svelte-1d2ae4n");
    			attr_dev(input, "type", "text");

    			attr_dev(input, "placeholder", input_placeholder_value = /*inputNum*/ ctx[115].filName === "scoring system"
    			? "Default: User Scoring"
    			: /*conditionalInputNumberList*/ ctx[19].includes(/*inputNum*/ ctx[115].filName)
    				? ">123 or 123"
    				: /*inputNum*/ ctx[115].defaultValue !== null
    					? "Default: " + /*inputNum*/ ctx[115].defaultValue
    					: "123");

    			input.value = input_value_value = /*inputNum*/ ctx[115].numberValue || "";
    			input.disabled = input_disabled_value = !/*showFilterOptions*/ ctx[8];
    			add_location(input, file$2, 1700, 32, 75028);
    			attr_dev(div1, "class", "value-input-number-wrap svelte-1d2ae4n");
    			add_location(div1, file$2, 1693, 28, 74619);
    			attr_dev(div2, "class", "filter-input-number svelte-1d2ae4n");
    			set_style(div2, "display", /*filterSelection*/ ctx[112].isSelected ? "" : "none");
    			add_location(div2, file$2, 1684, 24, 74178);
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
    			if (dirty[0] & /*$filterOptions*/ 2 && t0_value !== (t0_value = (/*inputNum*/ ctx[115].filName || "") + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*$filterOptions*/ 2 && t2_value !== (t2_value = "Number Filter: " + /*inputNum*/ ctx[115].filName + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*$filterOptions*/ 2 && label_for_value !== (label_for_value = "Number Filter: " + /*inputNum*/ ctx[115].filName)) {
    				attr_dev(label, "for", label_for_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && input_id_value !== (input_id_value = "Number Filter: " + /*inputNum*/ ctx[115].filName)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && input_placeholder_value !== (input_placeholder_value = /*inputNum*/ ctx[115].filName === "scoring system"
    			? "Default: User Scoring"
    			: /*conditionalInputNumberList*/ ctx[19].includes(/*inputNum*/ ctx[115].filName)
    				? ">123 or 123"
    				: /*inputNum*/ ctx[115].defaultValue !== null
    					? "Default: " + /*inputNum*/ ctx[115].defaultValue
    					: "123")) {
    				attr_dev(input, "placeholder", input_placeholder_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2 && input_value_value !== (input_value_value = /*inputNum*/ ctx[115].numberValue || "") && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty[0] & /*showFilterOptions*/ 256 && input_disabled_value !== (input_disabled_value = !/*showFilterOptions*/ ctx[8])) {
    				prop_dev(input, "disabled", input_disabled_value);
    			}

    			if (dirty[0] & /*$filterOptions*/ 2) {
    				set_style(div2, "display", /*filterSelection*/ ctx[112].isSelected ? "" : "none");
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
    		source: "(1684:20) {#if filterSelection.isSelected}",
    		ctx
    	});

    	return block;
    }

    // (1683:16) {#each filterSelection.filters["Input Number"] || [] as inputNum, inputNumIdx (filterSelection.filterSelectionName + inputNum.filName || {}
    function create_each_block_3(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = /*filterSelection*/ ctx[112].isSelected && create_if_block_7(ctx);

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

    			if (/*filterSelection*/ ctx[112].isSelected) {
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
    		source: "(1683:16) {#each filterSelection.filters[\\\"Input Number\\\"] || [] as inputNum, inputNumIdx (filterSelection.filterSelectionName + inputNum.filName || {}",
    		ctx
    	});

    	return block;
    }

    // (1410:12) {#each $filterOptions?.filterSelection || [] as filterSelection, filSelIdx (filterSelection.filterSelectionName || {}
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
    	let each_value_5 = /*filterSelection*/ ctx[112].filters.Dropdown || [];
    	validate_each_argument(each_value_5);
    	const get_key = ctx => /*filterSelection*/ ctx[112].filterSelectionName + /*Dropdown*/ ctx[121].filName || {};
    	validate_each_keys(ctx, each_value_5, get_each_context_5, get_key);

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		let child_ctx = get_each_context_5(ctx, each_value_5, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_2[i] = create_each_block_5(key, child_ctx));
    	}

    	let each_value_4 = /*filterSelection*/ ctx[112].filters.Checkbox || [];
    	validate_each_argument(each_value_4);
    	const get_key_1 = ctx => /*filterSelection*/ ctx[112].filterSelectionName + /*Checkbox*/ ctx[118].filName || {};
    	validate_each_keys(ctx, each_value_4, get_each_context_4, get_key_1);

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		let child_ctx = get_each_context_4(ctx, each_value_4, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks_1[i] = create_each_block_4(key, child_ctx));
    	}

    	let each_value_3 = /*filterSelection*/ ctx[112].filters["Input Number"] || [];
    	validate_each_argument(each_value_3);
    	const get_key_2 = ctx => /*filterSelection*/ ctx[112].filterSelectionName + /*inputNum*/ ctx[115].filName || {};
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

    			if (dirty[0] & /*$filterOptions, Init, maxFilterSelectionHeight, handleFilterSelectOptionChange, showFilterOptions, closeFilterSelect, windowWidth, filterSelect*/ 29360414) {
    				each_value_5 = /*filterSelection*/ ctx[112].filters.Dropdown || [];
    				validate_each_argument(each_value_5);
    				validate_each_keys(ctx, each_value_5, get_each_context_5, get_key);
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key, 1, ctx, each_value_5, each0_lookup, t0.parentNode, destroy_block, create_each_block_5, t0, get_each_context_5);
    			}

    			if (dirty[0] & /*handleCheckboxChange, $filterOptions, showFilterOptions, $initData*/ 33571074 | dirty[1] & /*pleaseWaitAlert*/ 32) {
    				each_value_4 = /*filterSelection*/ ctx[112].filters.Checkbox || [];
    				validate_each_argument(each_value_4);
    				validate_each_keys(ctx, each_value_4, get_each_context_4, get_key_1);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_1, 1, ctx, each_value_4, each1_lookup, t1.parentNode, destroy_block, create_each_block_4, t1, get_each_context_4);
    			}

    			if (dirty[0] & /*$filterOptions, conditionalInputNumberList, showFilterOptions, handleInputNumber*/ 67633410) {
    				each_value_3 = /*filterSelection*/ ctx[112].filters["Input Number"] || [];
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
    		source: "(1410:12) {#each $filterOptions?.filterSelection || [] as filterSelection, filSelIdx (filterSelection.filterSelectionName || {}",
    		ctx
    	});

    	return block;
    }

    // (1744:8) {#if !showAllActiveFilters}
    function create_if_block_5(ctx) {
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
    			attr_dev(path, "d", "M367 413 100 145a192 192 0 0 0 268 268zm45-46A192 192 0 0 0 145 99l269 268zM1 256a256 256 0 1 1 512 0 256 256 0 1 1-512 0z");
    			attr_dev(path, "class", "svelte-1d2ae4n");
    			add_location(path, file$2, 1753, 20, 77621);
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "class", "svelte-1d2ae4n");
    			add_location(svg, file$2, 1752, 16, 77572);
    			attr_dev(div, "tabindex", "0");
    			attr_dev(div, "class", "empty-tagFilter svelte-1d2ae4n");
    			attr_dev(div, "title", "Remove Filters");
    			add_location(div, file$2, 1744, 12, 77267);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*removeAllActiveTag*/ ctx[29], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_9*/ ctx[65], false, false, false, false)
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
    		source: "(1744:8) {#if !showAllActiveFilters}",
    		ctx
    	});

    	return block;
    }

    // (1765:12) {#if showAllActiveFilters}
    function create_if_block_4(ctx) {
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
    			attr_dev(path, "d", "M367 413 100 145a192 192 0 0 0 268 268zm45-46A192 192 0 0 0 145 99l269 268zM1 256a256 256 0 1 1 512 0 256 256 0 1 1-512 0z");
    			attr_dev(path, "class", "svelte-1d2ae4n");
    			add_location(path, file$2, 1775, 24, 78492);
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			attr_dev(svg, "class", "svelte-1d2ae4n");
    			add_location(svg, file$2, 1774, 20, 78439);
    			attr_dev(div, "tabindex", "0");
    			attr_dev(div, "class", "empty-tagFilter svelte-1d2ae4n");
    			attr_dev(div, "title", "Remove Filters");
    			add_location(div, file$2, 1765, 16, 78077);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*removeAllActiveTag*/ ctx[29], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler_10*/ ctx[66], false, false, false, false)
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
    		source: "(1765:12) {#if showAllActiveFilters}",
    		ctx
    	});

    	return block;
    }

    // (1829:20) {:else}
    function create_else_block_1(ctx) {
    	let h3;
    	let t_value = (/*activeTagFiltersArray*/ ctx[109]?.optionName || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "svelte-1d2ae4n");
    			add_location(h3, file$2, 1829, 24, 81328);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeTagFiltersArrays*/ 1024 && t_value !== (t_value = (/*activeTagFiltersArray*/ ctx[109]?.optionName || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(1829:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1823:64) 
    function create_if_block_3(ctx) {
    	let h3;
    	let t_value = (/*activeTagFiltersArray*/ ctx[109]?.optionType + ": " + /*activeTagFiltersArray*/ ctx[109]?.optionName || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "svelte-1d2ae4n");
    			add_location(h3, file$2, 1823, 24, 81058);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeTagFiltersArrays*/ 1024 && t_value !== (t_value = (/*activeTagFiltersArray*/ ctx[109]?.optionType + ": " + /*activeTagFiltersArray*/ ctx[109]?.optionName || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(1823:64) ",
    		ctx
    	});

    	return block;
    }

    // (1817:20) {#if activeTagFiltersArray?.filterType === "input number"}
    function create_if_block_2(ctx) {
    	let h3;
    	let t_value = (/*activeTagFiltersArray*/ ctx[109]?.optionName + ": " + /*activeTagFiltersArray*/ ctx[109]?.optionValue || "") + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "svelte-1d2ae4n");
    			add_location(h3, file$2, 1817, 24, 80750);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeTagFiltersArrays*/ 1024 && t_value !== (t_value = (/*activeTagFiltersArray*/ ctx[109]?.optionName + ": " + /*activeTagFiltersArray*/ ctx[109]?.optionValue || "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(1817:20) {#if activeTagFiltersArray?.filterType === \\\"input number\\\"}",
    		ctx
    	});

    	return block;
    }

    // (1782:12) {#each activeTagFiltersArrays || [] as activeTagFiltersArray (activeTagFiltersArray?.optionName + activeTagFiltersArray?.optionIdx + (activeTagFiltersArray?.optionType ?? "") || {}
    function create_each_block_1(key_1, ctx) {
    	let div;
    	let t0;
    	let svg;
    	let path;
    	let t1;
    	let div_outro;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type_6(ctx, dirty) {
    		if (/*activeTagFiltersArray*/ ctx[109]?.filterType === "input number") return create_if_block_2;
    		if (/*activeTagFiltersArray*/ ctx[109]?.optionType) return create_if_block_3;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_6(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[67](/*activeTagFiltersArray*/ ctx[109], ...args);
    	}

    	function keydown_handler_11(...args) {
    		return /*keydown_handler_11*/ ctx[68](/*activeTagFiltersArray*/ ctx[109], ...args);
    	}

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[69](/*activeTagFiltersArray*/ ctx[109], ...args);
    	}

    	function keydown_handler_12(...args) {
    		return /*keydown_handler_12*/ ctx[70](/*activeTagFiltersArray*/ ctx[109], ...args);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			t0 = space();
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t1 = space();
    			attr_dev(path, "d", "M343 151a32 32 0 0 0-46-46L192 211 87 105a32 32 0 0 0-46 46l106 105L41 361a32 32 0 0 0 46 46l105-106 105 106a32 32 0 0 0 46-46L237 256l106-105z");
    			attr_dev(path, "class", "svelte-1d2ae4n");
    			add_location(path, file$2, 1856, 24, 82701);
    			attr_dev(svg, "class", "removeActiveTag svelte-1d2ae4n");
    			attr_dev(svg, "viewBox", "0 0 400 512");
    			attr_dev(svg, "tabindex", "0");
    			add_location(svg, file$2, 1832, 20, 81463);
    			attr_dev(div, "class", "activeTagFilter svelte-1d2ae4n");
    			attr_dev(div, "tabindex", "0");

    			set_style(div, "--activeTagFilterColor", /*activeTagFiltersArray*/ ctx[109]?.selected === "included"
    			? "#5f9ea0"
    			: /*activeTagFiltersArray*/ ctx[109]?.selected === "excluded"
    				? "#e85d75"
    				: "#000");

    			add_location(div, file$2, 1782, 16, 78966);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, svg);
    			append_dev(svg, path);
    			append_dev(div, t1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "click", prevent_default(click_handler_2), false, true, false, false),
    					listen_dev(svg, "keydown", keydown_handler_11, false, false, false, false),
    					listen_dev(div, "click", click_handler_3, false, false, false, false),
    					listen_dev(div, "keydown", keydown_handler_12, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type_6(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			}

    			if (dirty[0] & /*activeTagFiltersArrays*/ 1024) {
    				set_style(div, "--activeTagFilterColor", /*activeTagFiltersArray*/ ctx[109]?.selected === "included"
    				? "#5f9ea0"
    				: /*activeTagFiltersArray*/ ctx[109]?.selected === "excluded"
    					? "#e85d75"
    					: "#000");
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
    			if_block.d();
    			if (detaching && div_outro) div_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(1782:12) {#each activeTagFiltersArrays || [] as activeTagFiltersArray (activeTagFiltersArray?.optionName + activeTagFiltersArray?.optionIdx + (activeTagFiltersArray?.optionType ?? \\\"\\\") || {}",
    		ctx
    	});

    	return block;
    }

    // (1989:4) {:else}
    function create_else_block(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			attr_dev(div0, "tabindex", "0");
    			attr_dev(div0, "class", "changeGridView svelte-1d2ae4n");
    			add_location(div0, file$2, 1991, 12, 89592);
    			attr_dev(div1, "class", "sortFilter skeleton shimmer svelte-1d2ae4n");
    			add_location(div1, file$2, 1997, 12, 89814);
    			attr_dev(div2, "class", "last-filter-option svelte-1d2ae4n");
    			add_location(div2, file$2, 1990, 8, 89546);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t);
    			append_dev(div2, div1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*handleGridView*/ ctx[33], false, false, false, false),
    					listen_dev(div0, "keydown", /*keydown_handler_19*/ ctx[77], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
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
    		source: "(1989:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1885:4) {#if $filterOptions}
    function create_if_block$2(ctx) {
    	let div7;
    	let div0;
    	let svg0;
    	let path0;
    	let path0_d_value;
    	let svg0_viewBox_value;
    	let t0;
    	let div6;
    	let svg1;
    	let path1;
    	let path1_d_value;
    	let svg1_viewBox_value;
    	let svg1_tabindex_value;
    	let t1;
    	let h20;
    	let t2_value = (/*selectedSortName*/ ctx[11] || "") + "";
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
    	let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[4]}px`;
    	let mounted;
    	let dispose;
    	let each_value = /*$filterOptions*/ ctx[1]?.sortFilter || [];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*sortFilter*/ ctx[106]?.sortName || {};
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
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t0 = space();
    			div6 = element("div");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
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

    			attr_dev(path0, "d", path0_d_value = /*isFullViewed*/ ctx[13]
    			? // arrows-up-down
    				"M183 9a32 32 0 0 0-46 0l-96 96a32 32 0 0 0 46 46l41-42v294l-41-42a32 32 0 0 0-46 46l96 96c13 12 33 12 46 0l96-96a32 32 0 0 0-46-46l-41 42V109l41 42a32 32 0 0 0 46-46L183 9z"
    			: // arrows-left-right
    				"m407 375 96-96c12-13 12-33 0-46l-96-96a32 32 0 0 0-46 46l42 41H109l42-41a32 32 0 0 0-46-46L9 233a32 32 0 0 0 0 46l96 96a32 32 0 0 0 46-46l-42-41h294l-42 41a32 32 0 0 0 46 46z");

    			attr_dev(path0, "class", "svelte-1d2ae4n");
    			add_location(path0, file$2, 1894, 20, 84346);
    			attr_dev(svg0, "viewBox", svg0_viewBox_value = `0 0 ${/*isFullViewed*/ ctx[13] ? "312" : "512"} 512`);
    			attr_dev(svg0, "class", "svelte-1d2ae4n");
    			add_location(svg0, file$2, 1893, 16, 84267);
    			attr_dev(div0, "tabindex", "0");
    			attr_dev(div0, "class", "changeGridView svelte-1d2ae4n");
    			add_location(div0, file$2, 1887, 12, 84042);

    			attr_dev(path1, "d", path1_d_value = // sortdown
    			/*selectedSortType*/ ctx[12] === "asc"
    			? "M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z"
    			: // sort up
    				"M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z");

    			attr_dev(path1, "class", "svelte-1d2ae4n");
    			add_location(path1, file$2, 1912, 20, 85402);
    			attr_dev(svg1, "viewBox", svg1_viewBox_value = `0 ${/*selectedSortType*/ ctx[12] === "asc" ? "-" : ""}140 320 512`);
    			attr_dev(svg1, "tabindex", svg1_tabindex_value = /*selectedSortElement*/ ctx[6] ? "" : "0");
    			attr_dev(svg1, "class", "svelte-1d2ae4n");
    			add_location(svg1, file$2, 1904, 16, 85032);
    			attr_dev(h20, "tabindex", h20_tabindex_value = /*selectedSortElement*/ ctx[6] ? "" : "0");
    			attr_dev(h20, "class", "svelte-1d2ae4n");
    			add_location(h20, file$2, 1920, 16, 85856);
    			attr_dev(h21, "class", "svelte-1d2ae4n");
    			add_location(h21, file$2, 1938, 28, 86683);
    			attr_dev(div1, "class", "closing-x svelte-1d2ae4n");

    			attr_dev(div1, "tabindex", div1_tabindex_value = /*selectedSortElement*/ ctx[6] && /*windowWidth*/ ctx[3] <= 425
    			? "0"
    			: "");

    			add_location(div1, file$2, 1940, 28, 86813);
    			attr_dev(div2, "class", "header svelte-1d2ae4n");
    			add_location(div2, file$2, 1937, 24, 86633);
    			attr_dev(div3, "class", "options svelte-1d2ae4n");
    			add_location(div3, file$2, 1954, 24, 87471);
    			attr_dev(div4, "class", div4_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedSortElement*/ ctx[6] ? "" : "hide")) + " svelte-1d2ae4n"));
    			add_location(div4, file$2, 1933, 20, 86452);

    			attr_dev(div5, "class", div5_class_value = "" + (null_to_empty("options-wrap " + (/*selectedSortElement*/ ctx[6]
    			? ""
    			: "disable-interaction hide")) + " svelte-1d2ae4n"));

    			set_style(div5, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			add_location(div5, file$2, 1928, 16, 86194);
    			attr_dev(div6, "class", "sortFilter svelte-1d2ae4n");
    			add_location(div6, file$2, 1903, 12, 84990);
    			attr_dev(div7, "class", "last-filter-option svelte-1d2ae4n");
    			add_location(div7, file$2, 1886, 8, 83996);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			append_dev(div0, svg0);
    			append_dev(svg0, path0);
    			append_dev(div7, t0);
    			append_dev(div7, div6);
    			append_dev(div6, svg1);
    			append_dev(svg1, path1);
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
    					listen_dev(div0, "click", /*handleGridView*/ ctx[33], false, false, false, false),
    					listen_dev(div0, "keydown", /*keydown_handler_14*/ ctx[72], false, false, false, false),
    					listen_dev(svg1, "click", /*changeSortType*/ ctx[32], false, false, false, false),
    					listen_dev(svg1, "keydown", /*keydown_handler_15*/ ctx[73], false, false, false, false),
    					listen_dev(h20, "click", /*handleSortFilterPopup*/ ctx[30], false, false, false, false),
    					listen_dev(h20, "keydown", /*keydown_handler_16*/ ctx[74], false, false, false, false),
    					listen_dev(div1, "keydown", /*keydown_handler_17*/ ctx[75], false, false, false, false),
    					listen_dev(div1, "click", /*handleSortFilterPopup*/ ctx[30], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*isFullViewed*/ 8192 && path0_d_value !== (path0_d_value = /*isFullViewed*/ ctx[13]
    			? // arrows-up-down
    				"M183 9a32 32 0 0 0-46 0l-96 96a32 32 0 0 0 46 46l41-42v294l-41-42a32 32 0 0 0-46 46l96 96c13 12 33 12 46 0l96-96a32 32 0 0 0-46-46l-41 42V109l41 42a32 32 0 0 0 46-46L183 9z"
    			: // arrows-left-right
    				"m407 375 96-96c12-13 12-33 0-46l-96-96a32 32 0 0 0-46 46l42 41H109l42-41a32 32 0 0 0-46-46L9 233a32 32 0 0 0 0 46l96 96a32 32 0 0 0 46-46l-42-41h294l-42 41a32 32 0 0 0 46 46z")) {
    				attr_dev(path0, "d", path0_d_value);
    			}

    			if (dirty[0] & /*isFullViewed*/ 8192 && svg0_viewBox_value !== (svg0_viewBox_value = `0 0 ${/*isFullViewed*/ ctx[13] ? "312" : "512"} 512`)) {
    				attr_dev(svg0, "viewBox", svg0_viewBox_value);
    			}

    			if (dirty[0] & /*selectedSortType*/ 4096 && path1_d_value !== (path1_d_value = // sortdown
    			/*selectedSortType*/ ctx[12] === "asc"
    			? "M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z"
    			: // sort up
    				"M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z")) {
    				attr_dev(path1, "d", path1_d_value);
    			}

    			if (dirty[0] & /*selectedSortType*/ 4096 && svg1_viewBox_value !== (svg1_viewBox_value = `0 ${/*selectedSortType*/ ctx[12] === "asc" ? "-" : ""}140 320 512`)) {
    				attr_dev(svg1, "viewBox", svg1_viewBox_value);
    			}

    			if (dirty[0] & /*selectedSortElement*/ 64 && svg1_tabindex_value !== (svg1_tabindex_value = /*selectedSortElement*/ ctx[6] ? "" : "0")) {
    				attr_dev(svg1, "tabindex", svg1_tabindex_value);
    			}

    			if (dirty[0] & /*selectedSortName*/ 2048 && t2_value !== (t2_value = (/*selectedSortName*/ ctx[11] || "") + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*selectedSortElement*/ 64 && h20_tabindex_value !== (h20_tabindex_value = /*selectedSortElement*/ ctx[6] ? "" : "0")) {
    				attr_dev(h20, "tabindex", h20_tabindex_value);
    			}

    			if (dirty[0] & /*selectedSortElement, windowWidth*/ 72 && div1_tabindex_value !== (div1_tabindex_value = /*selectedSortElement*/ ctx[6] && /*windowWidth*/ ctx[3] <= 425
    			? "0"
    			: "")) {
    				attr_dev(div1, "tabindex", div1_tabindex_value);
    			}

    			if (dirty[0] & /*$filterOptions, selectedSortType, selectedSortName*/ 6146 | dirty[1] & /*changeSort*/ 1) {
    				each_value = /*$filterOptions*/ ctx[1]?.sortFilter || [];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div3, destroy_block, create_each_block, null, get_each_context);
    			}

    			if (dirty[0] & /*selectedSortElement*/ 64 && div4_class_value !== (div4_class_value = "" + (null_to_empty("options-wrap-filter-info " + (/*selectedSortElement*/ ctx[6] ? "" : "hide")) + " svelte-1d2ae4n"))) {
    				attr_dev(div4, "class", div4_class_value);
    			}

    			if (dirty[0] & /*selectedSortElement*/ 64 && div5_class_value !== (div5_class_value = "" + (null_to_empty("options-wrap " + (/*selectedSortElement*/ ctx[6]
    			? ""
    			: "disable-interaction hide")) + " svelte-1d2ae4n"))) {
    				attr_dev(div5, "class", div5_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 16 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[4]}px`)) {
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
    		source: "(1885:4) {#if $filterOptions}",
    		ctx
    	});

    	return block;
    }

    // (1965:36) {#if selectedSortName === sortFilter?.sortName}
    function create_if_block_1$2(ctx) {
    	let svg;
    	let path;
    	let path_d_value;
    	let svg_viewBox_value;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");

    			attr_dev(path, "d", path_d_value = // sortdown
    			/*selectedSortType*/ ctx[12] === "asc"
    			? "M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z"
    			: // sort up
    				"M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z");

    			attr_dev(path, "class", "svelte-1d2ae4n");
    			add_location(path, file$2, 1972, 44, 88615);
    			attr_dev(svg, "viewBox", svg_viewBox_value = `0 ${/*selectedSortType*/ ctx[12] === "asc" ? "-180" : "100"} 320 512`);
    			attr_dev(svg, "class", "svelte-1d2ae4n");
    			add_location(svg, file$2, 1965, 40, 88206);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedSortType*/ 4096 && path_d_value !== (path_d_value = // sortdown
    			/*selectedSortType*/ ctx[12] === "asc"
    			? "M183 41a32 32 0 0 0-46 0L9 169c-9 10-12 23-7 35s17 20 30 20h256a32 32 0 0 0 23-55L183 41z"
    			: // sort up
    				"M183 471a32 32 0 0 1-46 0L9 343c-9-10-12-23-7-35s17-20 30-20h256a32 32 0 0 1 23 55L183 471z")) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty[0] & /*selectedSortType*/ 4096 && svg_viewBox_value !== (svg_viewBox_value = `0 ${/*selectedSortType*/ ctx[12] === "asc" ? "-180" : "100"} 320 512`)) {
    				attr_dev(svg, "viewBox", svg_viewBox_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(1965:36) {#if selectedSortName === sortFilter?.sortName}",
    		ctx
    	});

    	return block;
    }

    // (1956:28) {#each $filterOptions?.sortFilter || [] as sortFilter (sortFilter?.sortName || {}
    function create_each_block(key_1, ctx) {
    	let div;
    	let h3;
    	let t0_value = (/*sortFilter*/ ctx[106]?.sortName || "") + "";
    	let t0;
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;
    	let if_block = /*selectedSortName*/ ctx[11] === /*sortFilter*/ ctx[106]?.sortName && create_if_block_1$2(ctx);

    	function keydown_handler_18(...args) {
    		return /*keydown_handler_18*/ ctx[76](/*sortFilter*/ ctx[106], ...args);
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
    			attr_dev(h3, "class", "svelte-1d2ae4n");
    			add_location(h3, file$2, 1963, 36, 88042);
    			attr_dev(div, "class", "option svelte-1d2ae4n");
    			add_location(div, file$2, 1956, 32, 87639);
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
    							if (is_function(/*changeSort*/ ctx[31](/*sortFilter*/ ctx[106]?.sortName))) /*changeSort*/ ctx[31](/*sortFilter*/ ctx[106]?.sortName).apply(this, arguments);
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
    			if (dirty[0] & /*$filterOptions*/ 2 && t0_value !== (t0_value = (/*sortFilter*/ ctx[106]?.sortName || "") + "")) set_data_dev(t0, t0_value);

    			if (/*selectedSortName*/ ctx[11] === /*sortFilter*/ ctx[106]?.sortName) {
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
    		source: "(1956:28) {#each $filterOptions?.sortFilter || [] as sortFilter (sortFilter?.sortName || {}",
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
    	let label;
    	let t3;
    	let input;
    	let t4;
    	let div2;
    	let svg0;
    	let path0;
    	let svg0_tabindex_value;
    	let t5;
    	let div1;
    	let div1_class_value;
    	let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[4]}px`;
    	let t6;
    	let div3;
    	let svg1;
    	let path1;
    	let t7;
    	let div5;
    	let div5_class_value;
    	let t8;
    	let div8;
    	let t9;
    	let div6;
    	let t10;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t11;
    	let div7;
    	let svg2;
    	let path2;
    	let path2_d_value;
    	let svg2_class_value;
    	let div8_class_value;
    	let t12;
    	let t13;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[1]) return create_if_block_17;
    		return create_else_block_7;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = (/*$dataStatus*/ ctx[15] || !/*$username*/ ctx[17]) && create_if_block_14(ctx);
    	let if_block2 = /*$filterOptions*/ ctx[1] && create_if_block_13(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[1]) return create_if_block_6;
    		return create_else_block_5;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block3 = current_block_type_1(ctx);
    	let if_block4 = !/*showAllActiveFilters*/ ctx[7] && create_if_block_5(ctx);
    	let if_block5 = /*showAllActiveFilters*/ ctx[7] && create_if_block_4(ctx);
    	let each_value_1 = /*activeTagFiltersArrays*/ ctx[10] || [];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*activeTagFiltersArray*/ ctx[109]?.optionName + /*activeTagFiltersArray*/ ctx[109]?.optionIdx + (/*activeTagFiltersArray*/ ctx[109]?.optionType ?? "") || {};
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	function select_block_type_7(ctx, dirty) {
    		if (/*$filterOptions*/ ctx[1]) return create_if_block$2;
    		return create_else_block;
    	}

    	let current_block_type_2 = select_block_type_7(ctx);
    	let if_block6 = current_block_type_2(ctx);
    	const default_slot_template = /*#slots*/ ctx[44].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[43], null);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			div4 = element("div");
    			label = element("label");
    			label.textContent = "Search Title";
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			div2 = element("div");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t5 = space();
    			div1 = element("div");
    			if (if_block2) if_block2.c();
    			t6 = space();
    			div3 = element("div");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t7 = space();
    			div5 = element("div");
    			if_block3.c();
    			t8 = space();
    			div8 = element("div");
    			if (if_block4) if_block4.c();
    			t9 = space();
    			div6 = element("div");
    			if (if_block5) if_block5.c();
    			t10 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t11 = space();
    			div7 = element("div");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t12 = space();
    			if_block6.c();
    			t13 = space();
    			if (default_slot) default_slot.c();
    			attr_dev(div0, "class", "home-status svelte-1d2ae4n");
    			add_location(div0, file$2, 1264, 4, 50735);
    			attr_dev(label, "class", "disable-interaction svelte-1d2ae4n");
    			attr_dev(label, "for", "input-search");
    			add_location(label, file$2, 1289, 8, 51537);
    			attr_dev(input, "id", "input-search");
    			attr_dev(input, "class", "input-search svelte-1d2ae4n");
    			attr_dev(input, "type", "search");
    			attr_dev(input, "enterkeyhint", "search");
    			attr_dev(input, "autocomplete", "off");
    			attr_dev(input, "placeholder", "Search");
    			add_location(input, file$2, 1292, 8, 51645);
    			attr_dev(path0, "d", "M0 416c0 18 14 32 32 32h55a80 80 0 0 0 146 0h247a32 32 0 1 0 0-64H233a80 80 0 0 0-146 0H32c-18 0-32 14-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1-64 0zm192-160a32 32 0 1 1 64 0 32 32 0 1 1-64 0zm32-80c-33 0-61 20-73 48H32a32 32 0 1 0 0 64h247a80 80 0 0 0 146 0h55a32 32 0 1 0 0-64h-55a80 80 0 0 0-73-48zm-160-48a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73-64a80 80 0 0 0-146 0H32a32 32 0 1 0 0 64h87a80 80 0 0 0 146 0h215a32 32 0 1 0 0-64H265z");
    			attr_dev(path0, "class", "svelte-1d2ae4n");
    			add_location(path0, file$2, 1312, 16, 52397);
    			attr_dev(svg0, "class", "input-search-wrap-icon svelte-1d2ae4n");
    			attr_dev(svg0, "viewBox", "0 0 512 512");
    			attr_dev(svg0, "tabindex", svg0_tabindex_value = /*selectedFilterTypeElement*/ ctx[5] ? "" : "0");
    			add_location(svg0, file$2, 1303, 12, 52020);

    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty("options-wrap " + (/*selectedFilterTypeElement*/ ctx[5]
    			? ""
    			: "disable-interaction hide")) + " svelte-1d2ae4n"));

    			set_style(div1, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
    			add_location(div1, file$2, 1316, 12, 52918);
    			attr_dev(div2, "class", "filterType svelte-1d2ae4n");
    			add_location(div2, file$2, 1301, 8, 51914);
    			attr_dev(path1, "d", "M4 55c7-14 21-23 36-23h432c16 0 30 9 36 23s5 30-5 42L320 321v127c0 12-7 23-18 29s-23 4-33-3l-64-48c-8-6-13-16-13-26v-79L9 97a40 40 0 0 1-5-42z");
    			attr_dev(path1, "class", "svelte-1d2ae4n");
    			add_location(path1, file$2, 1384, 16, 56178);
    			attr_dev(svg1, "class", "showFilterOptions svelte-1d2ae4n");
    			attr_dev(svg1, "tabindex", "0");
    			attr_dev(svg1, "viewBox", "0 0 512 512");
    			add_location(svg1, file$2, 1375, 12, 55838);
    			attr_dev(div3, "class", "showFilterOptions-container svelte-1d2ae4n");
    			add_location(div3, file$2, 1373, 8, 55715);
    			attr_dev(div4, "class", "input-search-wrap svelte-1d2ae4n");
    			add_location(div4, file$2, 1288, 4, 51496);

    			attr_dev(div5, "class", div5_class_value = "" + (null_to_empty("filters " + (/*showFilterOptions*/ ctx[8]
    			? ""
    			: "disable-interaction") + (/*$hasWheel*/ ctx[18] ? " hasWheel" : "")) + " svelte-1d2ae4n"));

    			attr_dev(div5, "id", "filters");
    			set_style(div5, "--maxPaddingHeight", /*maxFilterSelectionHeight*/ ctx[4] + 65 + "px");
    			add_location(div5, file$2, 1390, 4, 56425);
    			attr_dev(div6, "id", "tagFilters");
    			attr_dev(div6, "class", "tagFilters svelte-1d2ae4n");
    			set_style(div6, "max-height", /*showAllActiveFilters*/ ctx[7] ? "200px" : "30px");
    			add_location(div6, file$2, 1759, 8, 77871);

    			attr_dev(path2, "d", path2_d_value = /*showAllActiveFilters*/ ctx[7]
    			? // angle-up
    				"M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z"
    			: // angle-down
    				"M201 343c13 12 33 12 46 0l160-160a32 32 0 0 0-46-46L224 275 87 137a32 32 0 0 0-46 46l160 160z");

    			attr_dev(path2, "class", "svelte-1d2ae4n");
    			add_location(path2, file$2, 1874, 16, 83451);
    			attr_dev(svg2, "class", svg2_class_value = "" + (null_to_empty("angle-" + (/*showAllActiveFilters*/ ctx[7] ? "up" : "down")) + " svelte-1d2ae4n"));
    			attr_dev(svg2, "viewBox", "0 0 450 512");
    			add_location(svg2, file$2, 1870, 12, 83300);
    			attr_dev(div7, "tabindex", "0");
    			attr_dev(div7, "class", "showHideActiveFilters svelte-1d2ae4n");
    			add_location(div7, file$2, 1864, 8, 83074);
    			attr_dev(div8, "class", div8_class_value = "" + (null_to_empty("activeFilters" + (/*showAllActiveFilters*/ ctx[7] ? " seenMore" : "")) + " svelte-1d2ae4n"));
    			add_location(div8, file$2, 1742, 4, 77143);
    			attr_dev(main, "id", "main-home");
    			attr_dev(main, "class", "svelte-1d2ae4n");
    			set_style(main, "--filters-space", /*showFilterOptions*/ ctx[8] ? "80px" : "");
    			add_location(main, file$2, 1263, 0, 50652);
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
    			append_dev(div4, label);
    			append_dev(div4, t3);
    			append_dev(div4, input);
    			set_input_value(input, /*$searchedAnimeKeyword*/ ctx[16]);
    			append_dev(div4, t4);
    			append_dev(div4, div2);
    			append_dev(div2, svg0);
    			append_dev(svg0, path0);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			append_dev(div3, svg1);
    			append_dev(svg1, path1);
    			append_dev(main, t7);
    			append_dev(main, div5);
    			if_block3.m(div5, null);
    			append_dev(main, t8);
    			append_dev(main, div8);
    			if (if_block4) if_block4.m(div8, null);
    			append_dev(div8, t9);
    			append_dev(div8, div6);
    			if (if_block5) if_block5.m(div6, null);
    			append_dev(div6, t10);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div6, null);
    				}
    			}

    			append_dev(div8, t11);
    			append_dev(div8, div7);
    			append_dev(div7, svg2);
    			append_dev(svg2, path2);
    			append_dev(main, t12);
    			if_block6.m(main, null);
    			append_dev(main, t13);

    			if (default_slot) {
    				default_slot.m(main, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[46]),
    					listen_dev(svg0, "click", /*handleShowFilterTypes*/ ctx[21], false, false, false, false),
    					listen_dev(svg0, "keydown", /*keydown_handler*/ ctx[47], false, false, false, false),
    					listen_dev(svg1, "click", /*handleShowFilterOptions*/ ctx[34], false, false, false, false),
    					listen_dev(svg1, "keydown", /*keydown_handler_3*/ ctx[50], false, false, false, false),
    					listen_dev(div5, "wheel", /*wheel_handler_2*/ ctx[64], false, false, false, false),
    					listen_dev(div7, "click", /*handleShowActiveFilters*/ ctx[35], false, false, false, false),
    					listen_dev(div7, "keydown", /*keydown_handler_13*/ ctx[71], false, false, false, false)
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

    			if (/*$dataStatus*/ ctx[15] || !/*$username*/ ctx[17]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$dataStatus, $username*/ 163840) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_14(ctx);
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

    			if (dirty[0] & /*$searchedAnimeKeyword*/ 65536 && input.value !== /*$searchedAnimeKeyword*/ ctx[16]) {
    				set_input_value(input, /*$searchedAnimeKeyword*/ ctx[16]);
    			}

    			if (!current || dirty[0] & /*selectedFilterTypeElement*/ 32 && svg0_tabindex_value !== (svg0_tabindex_value = /*selectedFilterTypeElement*/ ctx[5] ? "" : "0")) {
    				attr_dev(svg0, "tabindex", svg0_tabindex_value);
    			}

    			if (/*$filterOptions*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_13(ctx);
    					if_block2.c();
    					if_block2.m(div1, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!current || dirty[0] & /*selectedFilterTypeElement*/ 32 && div1_class_value !== (div1_class_value = "" + (null_to_empty("options-wrap " + (/*selectedFilterTypeElement*/ ctx[5]
    			? ""
    			: "disable-interaction hide")) + " svelte-1d2ae4n"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 16 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[4]}px`)) {
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

    			if (!current || dirty[0] & /*showFilterOptions, $hasWheel*/ 262400 && div5_class_value !== (div5_class_value = "" + (null_to_empty("filters " + (/*showFilterOptions*/ ctx[8]
    			? ""
    			: "disable-interaction") + (/*$hasWheel*/ ctx[18] ? " hasWheel" : "")) + " svelte-1d2ae4n"))) {
    				attr_dev(div5, "class", div5_class_value);
    			}

    			if (dirty[0] & /*maxFilterSelectionHeight*/ 16) {
    				set_style(div5, "--maxPaddingHeight", /*maxFilterSelectionHeight*/ ctx[4] + 65 + "px");
    			}

    			if (!/*showAllActiveFilters*/ ctx[7]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_5(ctx);
    					if_block4.c();
    					if_block4.m(div8, t9);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*showAllActiveFilters*/ ctx[7]) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_4(ctx);
    					if_block5.c();
    					if_block5.m(div6, t10);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (dirty[0] & /*activeTagFiltersArrays, changeActiveSelect, removeActiveTag*/ 402654208) {
    				each_value_1 = /*activeTagFiltersArrays*/ ctx[10] || [];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div6, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
    				check_outros();
    			}

    			if (dirty[0] & /*showAllActiveFilters*/ 128) {
    				set_style(div6, "max-height", /*showAllActiveFilters*/ ctx[7] ? "200px" : "30px");
    			}

    			if (!current || dirty[0] & /*showAllActiveFilters*/ 128 && path2_d_value !== (path2_d_value = /*showAllActiveFilters*/ ctx[7]
    			? // angle-up
    				"M201 137c13-12 33-12 46 0l160 160a32 32 0 0 1-46 46L224 205 87 343a32 32 0 0 1-46-46l160-160z"
    			: // angle-down
    				"M201 343c13 12 33 12 46 0l160-160a32 32 0 0 0-46-46L224 275 87 137a32 32 0 0 0-46 46l160 160z")) {
    				attr_dev(path2, "d", path2_d_value);
    			}

    			if (!current || dirty[0] & /*showAllActiveFilters*/ 128 && svg2_class_value !== (svg2_class_value = "" + (null_to_empty("angle-" + (/*showAllActiveFilters*/ ctx[7] ? "up" : "down")) + " svelte-1d2ae4n"))) {
    				attr_dev(svg2, "class", svg2_class_value);
    			}

    			if (!current || dirty[0] & /*showAllActiveFilters*/ 128 && div8_class_value !== (div8_class_value = "" + (null_to_empty("activeFilters" + (/*showAllActiveFilters*/ ctx[7] ? " seenMore" : "")) + " svelte-1d2ae4n"))) {
    				attr_dev(div8, "class", div8_class_value);
    			}

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_7(ctx)) && if_block6) {
    				if_block6.p(ctx, dirty);
    			} else {
    				if_block6.d(1);
    				if_block6 = current_block_type_2(ctx);

    				if (if_block6) {
    					if_block6.c();
    					if_block6.m(main, t13);
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[1] & /*$$scope*/ 4096)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[43],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[43])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[43], dirty, null),
    						null
    					);
    				}
    			}

    			if (dirty[0] & /*showFilterOptions*/ 256) {
    				set_style(main, "--filters-space", /*showFilterOptions*/ ctx[8] ? "80px" : "");
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
    		event.preventDefault();
    		event.stopPropagation();
    		element.scrollLeft = Math.max(0, element.scrollLeft + event.deltaY);
    	}
    }

    const wheel_handler = () => {
    	
    };

    const wheel_handler_1 = () => {
    	
    };

    function instance$2($$self, $$props, $$invalidate) {
    	let isFullViewed;
    	let $android;
    	let $gridFullView;
    	let $confirmPromise;
    	let $filterOptions;
    	let $animeLoaderWorker;
    	let $finalAnimeList;
    	let $checkAnimeLoaderStatus;
    	let $initData;
    	let $activeTagFilters;
    	let $dataStatus;
    	let $hiddenEntries;
    	let $searchedAnimeKeyword;
    	let $isImporting;
    	let $username;
    	let $hasWheel;
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(40, $android = $$value));
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(41, $gridFullView = $$value));
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(86, $confirmPromise = $$value));
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(1, $filterOptions = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(87, $animeLoaderWorker = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(88, $finalAnimeList = $$value));
    	validate_store(checkAnimeLoaderStatus, 'checkAnimeLoaderStatus');
    	component_subscribe($$self, checkAnimeLoaderStatus, $$value => $$invalidate(89, $checkAnimeLoaderStatus = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(14, $initData = $$value));
    	validate_store(activeTagFilters, 'activeTagFilters');
    	component_subscribe($$self, activeTagFilters, $$value => $$invalidate(42, $activeTagFilters = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(15, $dataStatus = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(90, $hiddenEntries = $$value));
    	validate_store(searchedAnimeKeyword, 'searchedAnimeKeyword');
    	component_subscribe($$self, searchedAnimeKeyword, $$value => $$invalidate(16, $searchedAnimeKeyword = $$value));
    	validate_store(isImporting, 'isImporting');
    	component_subscribe($$self, isImporting, $$value => $$invalidate(91, $isImporting = $$value));
    	validate_store(username, 'username');
    	component_subscribe($$self, username, $$value => $$invalidate(17, $username = $$value));
    	validate_store(hasWheel, 'hasWheel');
    	component_subscribe($$self, hasWheel, $$value => $$invalidate(18, $hasWheel = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Search', slots, ['default']);
    	let Init = true;
    	let windowWidth = Math.max(window.visualViewport.width, window.innerWidth);
    	let windowHeight = Math.max(window.visualViewport.height, window.innerHeight);
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

    	let scrollingToTop,
    		activeTagFiltersArrays,
    		selectedFilterSelectionIdx,
    		selectedFilterSelectionName,
    		selectedSortIdx,
    		selectedSort,
    		selectedSortName,
    		selectedSortType;

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
    		windowHeight = Math.max(window.visualViewport.height, window.innerHeight);
    		$$invalidate(4, maxFilterSelectionHeight = windowHeight * 0.3);
    		$$invalidate(3, windowWidth = Math.max(window.visualViewport.width, window.innerWidth));
    	}

    	async function handleFilterTypes(newFilterTypeName) {
    		if ($initData) return pleaseWaitAlert();
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;

    		if (nameTypeSelected !== newFilterTypeName) {
    			// Close Filter Dropdown
    			$$invalidate(6, selectedSortElement = false);

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

    		$$invalidate(5, selectedFilterTypeElement = false);
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
    			$$invalidate(5, selectedFilterTypeElement = true);
    		} else if ((!optionsWrap || classList.contains("closing-x")) && !classList.contains("options-wrap")) {
    			if (highlightedEl instanceof Element && highlightedEl.closest(".filterType")) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}

    			$$invalidate(5, selectedFilterTypeElement = false);
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
    		let idxTypeSelected = selectedFilterSelectionIdx;

    		if (selectedFilterElement instanceof Element) {
    			let filterSelectChildrenArray = Array.from(selectedFilterElement.parentElement.children).filter(el => {
    				return !el.classList.contains("disable-interaction");
    			});

    			let selectedIndex = filterSelectChildrenArray.indexOf(selectedFilterElement);

    			if ($filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[selectedIndex]) {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[selectedIndex].selected = false, $filterOptions);
    			}
    		}

    		if (Init) $$invalidate(2, Init = false);

    		if (highlightedEl instanceof Element && highlightedEl.closest(".filter-select")) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].selected = true, $filterOptions);
    		selectedFilterElement = filSelectEl;
    	}

    	function closeFilterSelect(dropDownIdx) {
    		let idxTypeSelected = selectedFilterSelectionIdx;
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
    			$$invalidate(5, selectedFilterTypeElement = false);

    			// Close Sort Filter Dropdown
    			$$invalidate(6, selectedSortElement = false);

    			// Close Filter Selection Dropdown
    			let idxTypeSelected = selectedFilterSelectionIdx;

    			$filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown.forEach(e => {
    				e.selected = false;
    			});

    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
    			selectedFilterElement = null;
    		} else if (!classList.contains("options-wrap") && !element.closest(".options-wrap")) {
    			// Large Screen Width
    			// Filter Type Dropdown
    			let filterTypeEl = element.closest(".filterType");

    			if (!classList.contains("filterType") && !filterTypeEl) {
    				if (highlightedEl instanceof Element && highlightedEl.closest(".filterType")) {
    					removeClass(highlightedEl, "highlight");
    					highlightedEl = null;
    				}

    				$$invalidate(5, selectedFilterTypeElement = false);
    			}

    			// Sort Filter Dropdown
    			let sortSelectEl = element.closest(".sortFilter");

    			if (!classList.contains("sortFilter") && !sortSelectEl) {
    				if (highlightedEl instanceof Element && highlightedEl.closest(".sortFilter")) {
    					removeClass(highlightedEl, "highlight");
    					highlightedEl = null;
    				}

    				$$invalidate(6, selectedSortElement = false);
    			}

    			// Filter Selection Dropdown
    			let inputDropdownSelectEl = element.closest(".select");

    			let inputDropdownAngleDown = element.closest(".angle-down");

    			if (!classList.contains("select") && !classList.contains("angle-down") && !inputDropdownAngleDown && !inputDropdownSelectEl) {
    				if (highlightedEl instanceof Element && highlightedEl.closest(".filter-select")) {
    					removeClass(highlightedEl, "highlight");
    					highlightedEl = null;
    				}

    				let idxTypeSelected = selectedFilterSelectionIdx;

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
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;
    		let currentValue = $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected;

    		if (currentValue === "none" || currentValue === true) {
    			// true is default value of selections
    			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "included", $filterOptions);

    			let hasActiveFilter = false;

    			set_store_value(
    				activeTagFilters,
    				$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
    					if (e.optionName + e.optionIdx + e.optionType === optionName + optionIdx + optionType) {
    						hasActiveFilter = true;
    						e.selected = "included";
    					}

    					return e;
    				}),
    				$activeTagFilters
    			);

    			if (!hasActiveFilter) {
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
    			}
    		} else if (currentValue === "included" && changeType === "write") {
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
    		let idxTypeSelected = selectedFilterSelectionIdx;

    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;
    		let isChecked = $filterOptions?.filterSelection?.[idxTypeSelected].filters.Checkbox[checkboxIdx].isSelected;

    		if (isChecked) {
    			set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === checkboxIdx && e.optionName === checkBoxName && e.filterType === "checkbox" && e.selected === "included")), $activeTagFilters);
    		} else {
    			let hasActiveFilter = false;

    			set_store_value(
    				activeTagFilters,
    				$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
    					if (e.optionName + e.optionIdx === checkBoxName + checkboxIdx) {
    						hasActiveFilter = true;
    						e.selected = "included";
    					}

    					return e;
    				}),
    				$activeTagFilters
    			);

    			if (!hasActiveFilter) {
    				$activeTagFilters[nameTypeSelected].unshift({
    					optionName: checkBoxName,
    					optionIdx: checkboxIdx,
    					filterType: "checkbox",
    					selected: "included",
    					changeType: "read"
    				});

    				activeTagFilters.set($activeTagFilters);
    			}
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
    		let idxTypeSelected = selectedFilterSelectionIdx;
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
    					let shouldReload = false;

    					if (!newCMPNumber) {
    						shouldReload = true;
    						set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === inputNumIdx && e.optionName === inputNumberName && e.filterType === "input number")), $activeTagFilters);
    					} else {
    						let hasActiveFilter = false;

    						set_store_value(
    							activeTagFilters,
    							$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
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
    		} else {
    			if (newValue !== currentValue && (!isNaN(newValue) && (parseFloat(newValue) >= minValue || typeof minValue !== "number") && (parseFloat(newValue) <= maxValue || typeof maxValue !== "number") || newValue === "")) {
    				let shouldReload = false;

    				if (newValue === "") {
    					shouldReload = true;
    					set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === inputNumIdx && e.optionName === inputNumberName && e.optionValue === currentValue && e.filterType === "input number")), $activeTagFilters);
    				} else {
    					let hasActiveFilter = false;

    					set_store_value(
    						activeTagFilters,
    						$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
    							if (e.optionName + e.optionIdx === inputNumberName + inputNumIdx) {
    								shouldReload = e.selected !== "none";
    								hasActiveFilter = true;
    								e.optionValue = newValue;
    							}

    							return e;
    						}),
    						$activeTagFilters
    					);

    					if (!hasActiveFilter) {
    						shouldReload = true;

    						$activeTagFilters[nameTypeSelected].unshift({
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
    		if ($initData) return pleaseWaitAlert();
    		let element = event?.target;
    		let classList = element?.classList;
    		if (classList?.contains?.("removeActiveTag") || element?.closest?.(".removeActiveTag")) return;
    		let idxTypeSelected = selectedFilterSelectionIdx;
    		let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;

    		if (filterType === "input number") {
    			let elementIdx = $activeTagFilters[nameTypeSelected].findIndex(item => item.optionName === optionName && item.optionValue === optionValue && item.optionIdx === optionIdx && item.filterType === "input number");

    			if (elementIdx >= 0) {
    				let currentSelect = $activeTagFilters[nameTypeSelected][elementIdx].selected;

    				if (currentSelect === "included") {
    					set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected][elementIdx].selected = "none", $activeTagFilters);
    				} else if (currentSelect != null) {
    					set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected][elementIdx].selected = "included", $activeTagFilters);
    				}
    			}
    		} else if (filterType === "checkbox") {
    			let tagFilterIdx = $activeTagFilters[nameTypeSelected].findIndex(e => e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === filterType);
    			let checkboxSelection = $activeTagFilters?.[nameTypeSelected]?.[tagFilterIdx]?.selected;

    			if (checkboxSelection === "included") {
    				set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected][tagFilterIdx].selected = "none", $activeTagFilters);
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[optionIdx].isSelected = false, $filterOptions);
    			} else if (checkboxSelection != null) {
    				set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected][tagFilterIdx].selected = "included", $activeTagFilters);
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Checkbox[optionIdx].isSelected = true, $filterOptions);
    			}
    		} else if (filterType === "dropdown") {
    			let currentSelect = $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected;

    			if (currentSelect === "included" && changeType === "write") {
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
    			} else if (currentSelect === "none") {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected = "included", $filterOptions);

    				set_store_value(
    					activeTagFilters,
    					$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
    						if (e.optionIdx === optionIdx && e.optionName === optionName && e.selected === "none" && (e.optionType ? e.optionType === optionType : true)) {
    							e.selected = "included";
    						}

    						return e;
    					}),
    					$activeTagFilters
    				);
    			} else {
    				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected = "none", $filterOptions);

    				set_store_value(
    					activeTagFilters,
    					$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
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
    		if ($initData) return pleaseWaitAlert();
    		let idxTypeSelected = selectedFilterSelectionIdx;
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
    		let idxTypeSelected = selectedFilterSelectionIdx;
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
    			$$invalidate(6, selectedSortElement = true);
    		} else if ((!optionsWrap || classList.contains("closing-x")) && !classList.contains("options-wrap")) {
    			if (highlightedEl instanceof Element && highlightedEl.closest(".sortFilter")) {
    				removeClass(highlightedEl, "highlight");
    				highlightedEl = null;
    			}

    			$$invalidate(6, selectedSortElement = false);
    		}
    	}

    	function changeSort(newSortName) {
    		if ($initData) return pleaseWaitAlert();
    		let idxSortSelected = selectedSortIdx;
    		let selectedSortFilter = $filterOptions?.sortFilter?.[idxSortSelected];
    		let sortName = selectedSortFilter?.sortName;
    		let sortType = selectedSortFilter?.sortType;

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

    		$$invalidate(6, selectedSortElement = false);
    	}

    	function changeSortType() {
    		if ($initData) return pleaseWaitAlert();
    		let idxSortSelected = selectedSortIdx;
    		let sortType = $filterOptions?.sortFilter?.[idxSortSelected]?.sortType;

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
    			let idxTypeSelected = selectedFilterSelectionIdx;
    			$$invalidate(5, selectedFilterTypeElement = null);
    			$$invalidate(6, selectedSortElement = null);

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
    			$$invalidate(8, showFilterOptions = val);
    		} else {
    			$$invalidate(8, showFilterOptions = !showFilterOptions);
    		}
    	}

    	async function handleShowActiveFilters(val = null) {
    		if ($finalAnimeList?.length > 36 && !$gridFullView) {
    			await callAsyncAnimeReload();
    		}

    		if (typeof val === "boolean") {
    			$$invalidate(7, showAllActiveFilters = val);
    		} else {
    			$$invalidate(7, showAllActiveFilters = !showAllActiveFilters);
    		}

    		scrollToFirstTagFilter();
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

    	window.checkOpenDropdown = () => {
    		return (selectedFilterElement || selectedFilterTypeElement || selectedSortElement) && Math.max(window.visualViewport.width, window.innerWidth) <= 425;
    	};

    	function closeDropdown() {
    		// Small Screen Width
    		if (highlightedEl instanceof Element) {
    			removeClass(highlightedEl, "highlight");
    			highlightedEl = null;
    		}

    		// Close Filter Type Dropdown
    		$$invalidate(5, selectedFilterTypeElement = false);

    		// Close Sort Filter Dropdown
    		$$invalidate(6, selectedSortElement = false);

    		// Close Filter Selection Dropdown
    		let idxTypeSelected = selectedFilterSelectionIdx;

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

    		filterEl.addEventListener("scroll", handleFilterScroll, { passive: true });

    		dragScroll(filterEl, "x", event => {
    			let element = event?.target;
    			return selectedFilterElement && (element?.classList?.contains?.("options-wrap") || element?.closest?.(".options-wrap"));
    		});

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

    	let checkedOriginalSizeForGridView = windowWidth > 750 && windowHeight > 695;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Search> was created with unknown prop '${key}'`);
    	});

    	const func = (Dropdown, { optionName }) => hasPartialMatch(optionName, Dropdown?.optKeyword) || Dropdown?.optKeyword === "";

    	function input_input_handler() {
    		$searchedAnimeKeyword = this.value;
    		searchedAnimeKeyword.set($searchedAnimeKeyword);
    	}

    	const keydown_handler = e => e.key === "Enter" && handleShowFilterTypes(e);
    	const keydown_handler_1 = e => e.key === "Enter" && handleShowFilterTypes(e);
    	const keydown_handler_2 = (filterSelection, e) => e.key === "Enter" && handleFilterTypes(filterSelection?.filterSelectionName);
    	const keydown_handler_3 = e => e.key === "Enter" && handleShowFilterOptions(e);

    	function input0_input_handler(filSelIdx, dropdownIdx) {
    		$filterOptions.filterSelection[filSelIdx].filters.Dropdown[dropdownIdx].optKeyword = this.value;
    		filterOptions.set($filterOptions);
    	}

    	const keydown_handler_4 = (dropdownIdx, e) => e.key === "Enter" && closeFilterSelect(dropdownIdx);
    	const keydown_handler_5 = (dropdownIdx, e) => (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") && filterSelect(e, dropdownIdx);

    	const click_handler = (dropdownIdx, e) => {
    		filterSelect(e, dropdownIdx);
    	};

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

    		if (isFullViewed) {
    			if (!scrollingToTop && e.deltaY < 0) {
    				$$invalidate(9, scrollingToTop = true);
    				let newScrollPosition = 0;
    				document.documentElement.scrollTop = newScrollPosition;
    				$$invalidate(9, scrollingToTop = false);
    			}
    		}
    	};

    	const keydown_handler_9 = e => e.key === "Enter" && removeAllActiveTag();
    	const keydown_handler_10 = e => e.key === "Enter" && removeAllActiveTag();
    	const click_handler_2 = (activeTagFiltersArray, e) => removeActiveTag(e, activeTagFiltersArray?.optionIdx, activeTagFiltersArray?.optionName, activeTagFiltersArray?.filterType, activeTagFiltersArray?.categIdx, activeTagFiltersArray?.optionType);
    	const keydown_handler_11 = (activeTagFiltersArray, e) => e.key === "Enter" && removeActiveTag(e, activeTagFiltersArray?.optionIdx, activeTagFiltersArray?.optionName, activeTagFiltersArray?.filterType, activeTagFiltersArray?.categIdx, activeTagFiltersArray?.optionType);
    	const click_handler_3 = (activeTagFiltersArray, e) => changeActiveSelect(e, activeTagFiltersArray?.optionIdx, activeTagFiltersArray?.optionName, activeTagFiltersArray?.filterType, activeTagFiltersArray?.categIdx, activeTagFiltersArray?.changeType, activeTagFiltersArray?.optionType, activeTagFiltersArray?.optionValue);
    	const keydown_handler_12 = (activeTagFiltersArray, e) => e.key === "Enter" && changeActiveSelect(e, activeTagFiltersArray?.optionIdx, activeTagFiltersArray?.optionName, activeTagFiltersArray?.filterType, activeTagFiltersArray?.categIdx, activeTagFiltersArray?.changeType, activeTagFiltersArray?.optionType, activeTagFiltersArray?.optionValue);
    	const keydown_handler_13 = e => e.key === "Enter" && handleShowActiveFilters();
    	const keydown_handler_14 = e => e.key === "Enter" && handleGridView();
    	const keydown_handler_15 = e => e.key === "Enter" && changeSortType();
    	const keydown_handler_16 = e => e.key === "Enter" && handleSortFilterPopup(e);
    	const keydown_handler_17 = e => e.key === "Enter" && handleSortFilterPopup(e);
    	const keydown_handler_18 = (sortFilter, e) => e.key === "Enter" && changeSort(sortFilter?.sortName);
    	const keydown_handler_19 = e => e.key === "Enter" && handleGridView();

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(43, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		saveJSON,
    		android: android$1,
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
    		fade,
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
    		scrollingToTop,
    		activeTagFiltersArrays,
    		selectedFilterSelectionIdx,
    		selectedFilterSelectionName,
    		selectedSortIdx,
    		selectedSort,
    		selectedSortName,
    		selectedSortType,
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
    		checkedOriginalSizeForGridView,
    		isFullViewed,
    		$android,
    		$gridFullView,
    		$confirmPromise,
    		$filterOptions,
    		$animeLoaderWorker,
    		$finalAnimeList,
    		$checkAnimeLoaderStatus,
    		$initData,
    		$activeTagFilters,
    		$dataStatus,
    		$hiddenEntries,
    		$searchedAnimeKeyword,
    		$isImporting,
    		$username,
    		$hasWheel
    	});

    	$$self.$inject_state = $$props => {
    		if ('Init' in $$props) $$invalidate(2, Init = $$props.Init);
    		if ('windowWidth' in $$props) $$invalidate(3, windowWidth = $$props.windowWidth);
    		if ('windowHeight' in $$props) windowHeight = $$props.windowHeight;
    		if ('maxFilterSelectionHeight' in $$props) $$invalidate(4, maxFilterSelectionHeight = $$props.maxFilterSelectionHeight);
    		if ('selectedFilterTypeElement' in $$props) $$invalidate(5, selectedFilterTypeElement = $$props.selectedFilterTypeElement);
    		if ('selectedFilterElement' in $$props) selectedFilterElement = $$props.selectedFilterElement;
    		if ('selectedSortElement' in $$props) $$invalidate(6, selectedSortElement = $$props.selectedSortElement);
    		if ('highlightedEl' in $$props) highlightedEl = $$props.highlightedEl;
    		if ('filterScrollTimeout' in $$props) filterScrollTimeout = $$props.filterScrollTimeout;
    		if ('filterIsScrolling' in $$props) filterIsScrolling = $$props.filterIsScrolling;
    		if ('showAllActiveFilters' in $$props) $$invalidate(7, showAllActiveFilters = $$props.showAllActiveFilters);
    		if ('showFilterOptions' in $$props) $$invalidate(8, showFilterOptions = $$props.showFilterOptions);
    		if ('nameChangeUpdateProcessedList' in $$props) nameChangeUpdateProcessedList = $$props.nameChangeUpdateProcessedList;
    		if ('nameChangeUpdateFinalList' in $$props) nameChangeUpdateFinalList = $$props.nameChangeUpdateFinalList;
    		if ('conditionalInputNumberList' in $$props) $$invalidate(19, conditionalInputNumberList = $$props.conditionalInputNumberList);
    		if ('isUpdatingRec' in $$props) isUpdatingRec = $$props.isUpdatingRec;
    		if ('isLoadingAnime' in $$props) isLoadingAnime = $$props.isLoadingAnime;
    		if ('scrollingToTop' in $$props) $$invalidate(9, scrollingToTop = $$props.scrollingToTop);
    		if ('activeTagFiltersArrays' in $$props) $$invalidate(10, activeTagFiltersArrays = $$props.activeTagFiltersArrays);
    		if ('selectedFilterSelectionIdx' in $$props) $$invalidate(37, selectedFilterSelectionIdx = $$props.selectedFilterSelectionIdx);
    		if ('selectedFilterSelectionName' in $$props) $$invalidate(0, selectedFilterSelectionName = $$props.selectedFilterSelectionName);
    		if ('selectedSortIdx' in $$props) $$invalidate(38, selectedSortIdx = $$props.selectedSortIdx);
    		if ('selectedSort' in $$props) $$invalidate(39, selectedSort = $$props.selectedSort);
    		if ('selectedSortName' in $$props) $$invalidate(11, selectedSortName = $$props.selectedSortName);
    		if ('selectedSortType' in $$props) $$invalidate(12, selectedSortType = $$props.selectedSortType);
    		if ('asyncAnimeReloadPromise' in $$props) asyncAnimeReloadPromise = $$props.asyncAnimeReloadPromise;
    		if ('checkedOriginalSizeForGridView' in $$props) $$invalidate(105, checkedOriginalSizeForGridView = $$props.checkedOriginalSizeForGridView);
    		if ('isFullViewed' in $$props) $$invalidate(13, isFullViewed = $$props.isFullViewed);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*$filterOptions*/ 2) {
    			$$invalidate(37, selectedFilterSelectionIdx = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected));
    		}

    		if ($$self.$$.dirty[0] & /*$filterOptions*/ 2 | $$self.$$.dirty[1] & /*selectedFilterSelectionIdx*/ 64) {
    			$$invalidate(0, selectedFilterSelectionName = $filterOptions?.filterSelection?.[selectedFilterSelectionIdx]?.filterSelectionName);
    		}

    		if ($$self.$$.dirty[0] & /*selectedFilterSelectionName*/ 1 | $$self.$$.dirty[1] & /*$activeTagFilters*/ 2048) {
    			$$invalidate(10, activeTagFiltersArrays = $activeTagFilters?.[selectedFilterSelectionName] || []);
    		}

    		if ($$self.$$.dirty[0] & /*$filterOptions*/ 2) {
    			$$invalidate(38, selectedSortIdx = $filterOptions?.sortFilter?.findIndex(({ sortType }) => sortType !== "none"));
    		}

    		if ($$self.$$.dirty[0] & /*$filterOptions*/ 2 | $$self.$$.dirty[1] & /*selectedSortIdx*/ 128) {
    			$$invalidate(39, selectedSort = $filterOptions?.sortFilter?.[selectedSortIdx]);
    		}

    		if ($$self.$$.dirty[1] & /*selectedSort*/ 256) {
    			$$invalidate(11, selectedSortName = selectedSort?.sortName);
    		}

    		if ($$self.$$.dirty[1] & /*selectedSort*/ 256) {
    			$$invalidate(12, selectedSortType = selectedSort?.sortType);
    		}

    		if ($$self.$$.dirty[1] & /*$gridFullView, $android*/ 1536) {
    			$$invalidate(13, isFullViewed = $gridFullView ?? getLocalStorage("gridFullView") ?? (!$android && checkedOriginalSizeForGridView));
    		}
    	};

    	return [
    		selectedFilterSelectionName,
    		$filterOptions,
    		Init,
    		windowWidth,
    		maxFilterSelectionHeight,
    		selectedFilterTypeElement,
    		selectedSortElement,
    		showAllActiveFilters,
    		showFilterOptions,
    		scrollingToTop,
    		activeTagFiltersArrays,
    		selectedSortName,
    		selectedSortType,
    		isFullViewed,
    		$initData,
    		$dataStatus,
    		$searchedAnimeKeyword,
    		$username,
    		$hasWheel,
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
    		selectedFilterSelectionIdx,
    		selectedSortIdx,
    		selectedSort,
    		$android,
    		$gridFullView,
    		$activeTagFilters,
    		$$scope,
    		slots,
    		func,
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
    	let div1;
    	let t3;
    	let button;
    	let t4;
    	let div2_outro;
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
    			t2 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t3 = space();
    			button = element("button");
    			t4 = text(/*confirmLabel*/ ctx[4]);
    			attr_dev(h20, "class", "confirm-title svelte-iuqa3i");
    			add_location(h20, file$1, 65, 20, 2133);
    			attr_dev(h21, "class", "confirm-text svelte-iuqa3i");
    			add_location(h21, file$1, 66, 20, 2200);
    			attr_dev(div0, "class", "confirm-info-container svelte-iuqa3i");
    			add_location(div0, file$1, 64, 16, 2075);
    			attr_dev(button, "class", "button svelte-iuqa3i");
    			add_location(button, file$1, 80, 20, 2790);
    			attr_dev(div1, "class", "confirm-button-container svelte-iuqa3i");
    			add_location(div1, file$1, 70, 16, 2339);
    			attr_dev(div2, "class", "confirm-container svelte-iuqa3i");
    			add_location(div2, file$1, 63, 12, 1997);
    			attr_dev(div3, "class", "confirm-wrapper svelte-iuqa3i");
    			add_location(div3, file$1, 62, 8, 1954);
    			attr_dev(div4, "class", "confirm svelte-iuqa3i");
    			add_location(div4, file$1, 56, 4, 1732);
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
    			h21.innerHTML = /*confirmText*/ ctx[3];
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t3);
    			append_dev(div1, button);
    			append_dev(button, t4);
    			/*button_binding*/ ctx[11](button);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*handleConfirm*/ ctx[7], false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler_1*/ ctx[12], false, false, false, false),
    					listen_dev(div4, "click", /*handleConfirmVisibility*/ ctx[9], false, false, false, false),
    					listen_dev(div4, "touchend", /*handleConfirmVisibility*/ ctx[9], { passive: true }, false, false, false),
    					listen_dev(div4, "keydown", /*keydown_handler_2*/ ctx[13], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*confirmTitle*/ 4) set_data_dev(t0, /*confirmTitle*/ ctx[2]);
    			if (!current || dirty & /*confirmText*/ 8) h21.innerHTML = /*confirmText*/ ctx[3];
    			if (!/*isAlert*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
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
    			/*button_binding*/ ctx[11](null);
    			if (detaching && div2_outro) div2_outro.end();
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

    // (72:20) {#if !isAlert}
    function create_if_block_1$1(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*cancelLabel*/ ctx[5]);
    			attr_dev(button, "class", "button svelte-iuqa3i");
    			add_location(button, file$1, 72, 24, 2439);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*handleCancel*/ ctx[8], false, false, false, false),
    					listen_dev(button, "keydown", /*keydown_handler*/ ctx[10], false, false, false, false)
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
    		source: "(72:20) {#if !isAlert}",
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
    		fade,
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
    		handleConfirmVisibility
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

    // (1092:1) {#if _progress > 0 && _progress < 100}
    function create_if_block_1(ctx) {
    	let div;
    	let div_outro;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "progress svelte-8lnr17");
    			set_style(div, "--progress", "-" + (100 - /*_progress*/ ctx[6]) + "%");
    			add_location(div, file, 1092, 2, 29378);
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
    		source: "(1092:1) {#if _progress > 0 && _progress < 100}",
    		ctx
    	});

    	return block;
    }

    // (1106:2) <C.Others.Search>
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
    		source: "(1106:2) <C.Others.Search>",
    		ctx
    	});

    	return block;
    }

    // (1123:1) {#if $listUpdateAvailable}
    function create_if_block(ctx) {
    	let div;
    	let svg;
    	let path;
    	let svg_class_value;
    	let t0;
    	let h3;
    	let div_outro;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			h3 = element("h3");
    			h3.textContent = "List Update";
    			attr_dev(path, "d", "M105 203a160 160 0 0 1 264-60l17 17h-50a32 32 0 1 0 0 64h128c18 0 32-14 32-32V64a32 32 0 1 0-64 0v51l-18-17a224 224 0 0 0-369 83 32 32 0 0 0 60 22zm-66 86a32 32 0 0 0-23 31v128a32 32 0 1 0 64 0v-51l18 17a224 224 0 0 0 369-83 32 32 0 0 0-60-22 160 160 0 0 1-264 60l-17-17h50a32 32 0 1 0 0-64H48a39 39 0 0 0-9 1z");
    			add_location(path, file, 1136, 4, 30532);
    			attr_dev(svg, "class", svg_class_value = "" + (null_to_empty("list-update-icon" + (/*$listIsUpdating*/ ctx[7] ? " spin" : "")) + " svelte-8lnr17"));
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file, 1131, 3, 30394);
    			attr_dev(h3, "class", "list-update-label svelte-8lnr17");
    			add_location(h3, file, 1140, 3, 30882);
    			attr_dev(div, "class", "list-update-container svelte-8lnr17");
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file, 1124, 2, 30211);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);
    			append_dev(div, t0);
    			append_dev(div, h3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*updateList*/ ctx[11], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler*/ ctx[17], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*$listIsUpdating*/ 128 && svg_class_value !== (svg_class_value = "" + (null_to_empty("list-update-icon" + (/*$listIsUpdating*/ ctx[7] ? " spin" : "")) + " svelte-8lnr17"))) {
    				attr_dev(svg, "class", svg_class_value);
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
    		id: create_if_block.name,
    		type: "if",
    		source: "(1123:1) {#if $listUpdateAvailable}",
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

    	c_others_confirm.$on("confirmed", /*handleConfirmationConfirmed*/ ctx[9]);
    	c_others_confirm.$on("cancelled", /*handleConfirmationCancelled*/ ctx[10]);
    	let if_block1 = /*$listUpdateAvailable*/ ctx[8] && create_if_block(ctx);

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
    			attr_dev(div, "class", "home svelte-8lnr17");
    			attr_dev(div, "id", "home");
    			add_location(div, file, 1104, 1, 29649);
    			attr_dev(main, "class", "svelte-8lnr17");
    			add_location(main, file, 1090, 0, 29327);
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

    			if (dirty[2] & /*$$scope*/ 16) {
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

    			if (/*$listUpdateAvailable*/ ctx[8]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*$listUpdateAvailable*/ 256) {
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
    	let $isFullViewed;
    	let $animeOptionVisible;
    	let $android;
    	let $confirmPromise;
    	let $dataStatus;
    	let $hiddenEntries;
    	let $finalAnimeList;
    	let $searchedAnimeKeyword;
    	let $animeLoaderWorker;
    	let $listIsUpdating;
    	let $isScrolling;
    	let $shouldGoBack;
    	let $gridFullView;
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
    	let $listUpdateAvailable;
    	let $autoPlay;
    	let $filterOptions;
    	let $activeTagFilters;
    	let $username;
    	let $exportPathIsAvailable;
    	let $appID;
    	validate_store(isFullViewed, 'isFullViewed');
    	component_subscribe($$self, isFullViewed, $$value => $$invalidate(14, $isFullViewed = $$value));
    	validate_store(animeOptionVisible, 'animeOptionVisible');
    	component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(15, $animeOptionVisible = $$value));
    	validate_store(android$1, 'android');
    	component_subscribe($$self, android$1, $$value => $$invalidate(16, $android = $$value));
    	validate_store(confirmPromise, 'confirmPromise');
    	component_subscribe($$self, confirmPromise, $$value => $$invalidate(30, $confirmPromise = $$value));
    	validate_store(dataStatus, 'dataStatus');
    	component_subscribe($$self, dataStatus, $$value => $$invalidate(31, $dataStatus = $$value));
    	validate_store(hiddenEntries, 'hiddenEntries');
    	component_subscribe($$self, hiddenEntries, $$value => $$invalidate(32, $hiddenEntries = $$value));
    	validate_store(finalAnimeList, 'finalAnimeList');
    	component_subscribe($$self, finalAnimeList, $$value => $$invalidate(33, $finalAnimeList = $$value));
    	validate_store(searchedAnimeKeyword, 'searchedAnimeKeyword');
    	component_subscribe($$self, searchedAnimeKeyword, $$value => $$invalidate(34, $searchedAnimeKeyword = $$value));
    	validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
    	component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(35, $animeLoaderWorker = $$value));
    	validate_store(listIsUpdating, 'listIsUpdating');
    	component_subscribe($$self, listIsUpdating, $$value => $$invalidate(7, $listIsUpdating = $$value));
    	validate_store(isScrolling, 'isScrolling');
    	component_subscribe($$self, isScrolling, $$value => $$invalidate(36, $isScrolling = $$value));
    	validate_store(shouldGoBack, 'shouldGoBack');
    	component_subscribe($$self, shouldGoBack, $$value => $$invalidate(37, $shouldGoBack = $$value));
    	validate_store(gridFullView, 'gridFullView');
    	component_subscribe($$self, gridFullView, $$value => $$invalidate(38, $gridFullView = $$value));
    	validate_store(popupVisible, 'popupVisible');
    	component_subscribe($$self, popupVisible, $$value => $$invalidate(39, $popupVisible = $$value));
    	validate_store(menuVisible, 'menuVisible');
    	component_subscribe($$self, menuVisible, $$value => $$invalidate(40, $menuVisible = $$value));
    	validate_store(userRequestIsRunning, 'userRequestIsRunning');
    	component_subscribe($$self, userRequestIsRunning, $$value => $$invalidate(41, $userRequestIsRunning = $$value));
    	validate_store(autoUpdateInterval, 'autoUpdateInterval');
    	component_subscribe($$self, autoUpdateInterval, $$value => $$invalidate(42, $autoUpdateInterval = $$value));
    	validate_store(autoExportInterval, 'autoExportInterval');
    	component_subscribe($$self, autoExportInterval, $$value => $$invalidate(43, $autoExportInterval = $$value));
    	validate_store(initData, 'initData');
    	component_subscribe($$self, initData, $$value => $$invalidate(44, $initData = $$value));
    	validate_store(hasWheel, 'hasWheel');
    	component_subscribe($$self, hasWheel, $$value => $$invalidate(45, $hasWheel = $$value));
    	validate_store(autoUpdate, 'autoUpdate');
    	component_subscribe($$self, autoUpdate, $$value => $$invalidate(46, $autoUpdate = $$value));
    	validate_store(autoExport, 'autoExport');
    	component_subscribe($$self, autoExport, $$value => $$invalidate(47, $autoExport = $$value));
    	validate_store(scrollingTimeout, 'scrollingTimeout');
    	component_subscribe($$self, scrollingTimeout, $$value => $$invalidate(48, $scrollingTimeout = $$value));
    	validate_store(lastRunnedAutoExportDate, 'lastRunnedAutoExportDate');
    	component_subscribe($$self, lastRunnedAutoExportDate, $$value => $$invalidate(49, $lastRunnedAutoExportDate = $$value));
    	validate_store(lastRunnedAutoUpdateDate, 'lastRunnedAutoUpdateDate');
    	component_subscribe($$self, lastRunnedAutoUpdateDate, $$value => $$invalidate(50, $lastRunnedAutoUpdateDate = $$value));
    	validate_store(listUpdateAvailable, 'listUpdateAvailable');
    	component_subscribe($$self, listUpdateAvailable, $$value => $$invalidate(8, $listUpdateAvailable = $$value));
    	validate_store(autoPlay, 'autoPlay');
    	component_subscribe($$self, autoPlay, $$value => $$invalidate(51, $autoPlay = $$value));
    	validate_store(filterOptions, 'filterOptions');
    	component_subscribe($$self, filterOptions, $$value => $$invalidate(52, $filterOptions = $$value));
    	validate_store(activeTagFilters, 'activeTagFilters');
    	component_subscribe($$self, activeTagFilters, $$value => $$invalidate(53, $activeTagFilters = $$value));
    	validate_store(username, 'username');
    	component_subscribe($$self, username, $$value => $$invalidate(54, $username = $$value));
    	validate_store(exportPathIsAvailable, 'exportPathIsAvailable');
    	component_subscribe($$self, exportPathIsAvailable, $$value => $$invalidate(55, $exportPathIsAvailable = $$value));
    	validate_store(appID, 'appID');
    	component_subscribe($$self, appID, $$value => $$invalidate(56, $appID = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	set_store_value(android$1, $android = isAndroid(), $android); // Android/Browser Identifier
    	let windowWidth = Math.max(window.visualViewport.width, window.innerWidth);
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
    				set_store_value(dataStatus, $dataStatus = "Please Wait...", $dataStatus);
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

    			let _gridFullView = await retrieveJSON("gridFullView") ?? (!$android && windowWidth > 750 && windowHeight > 695);

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
    			} else if (usernameInputEl && usernameInputEl === document?.activeElement && Math.max(window.visualViewport.width, window.innerWidth) <= 750) {
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

    	window.addEventListener(
    		"scroll",
    		() => {
    			if (document.documentElement.scrollTop > Math.max(0, animeGridEl?.offsetTop - 55) && !willExit) window.setShouldGoBack(false);
    			runIsScrolling.update(e => !e);
    		},
    		{ passive: true }
    	);

    	onMount(() => {
    		usernameInputEl = document.getElementById("usernameInput");
    		animeGridEl = document.getElementById("anime-grid");

    		animeGridEl?.addEventListener(
    			"scroll",
    			() => {
    				if (animeGridEl.scrollLeft > Math.max(0, animeGridEl?.offsetTop - 55) && !willExit) window.setShouldGoBack(false);
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

    		$$invalidate(12, windowWidth = Math.max(window.visualViewport.width, window.innerWidth));
    		windowHeight = Math.max(window.visualViewport.height, window.innerHeight);

    		window.addEventListener("resize", () => {
    			windowHeight = Math.max(window.visualViewport.height, window.innerHeight);
    			$$invalidate(12, windowWidth = Math.max(window.visualViewport.width, window.innerWidth));
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

    	async function updateList() {
    		if (await $confirmPromise({
    			title: "List update is available",
    			text: "Are you sure you want to refresh the list?"
    		})) {
    			set_store_value(listIsUpdating, $listIsUpdating = true, $listIsUpdating);

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

    	let changeStatusBarColorTimeout;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const keydown_handler = e => e.key === "Enter" && updateList();

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
    		listIsUpdating,
    		isFullViewed,
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
    		getAnimeEntries,
    		getFilterOptions,
    		requestAnimeEntries,
    		requestUserEntries,
    		processRecommendedAnimeList,
    		animeLoader,
    		exportUserData,
    		isAndroid,
    		ncsCompare,
    		setLocalStorage,
    		windowWidth,
    		windowHeight,
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
    		updateList,
    		_progress,
    		progressFrame,
    		progressChangeStart,
    		changeStatusBarColorTimeout,
    		$isFullViewed,
    		$animeOptionVisible,
    		$android,
    		$confirmPromise,
    		$dataStatus,
    		$hiddenEntries,
    		$finalAnimeList,
    		$searchedAnimeKeyword,
    		$animeLoaderWorker,
    		$listIsUpdating,
    		$isScrolling,
    		$shouldGoBack,
    		$gridFullView,
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
    		$listUpdateAvailable,
    		$autoPlay,
    		$filterOptions,
    		$activeTagFilters,
    		$username,
    		$exportPathIsAvailable,
    		$appID
    	});

    	$$self.$inject_state = $$props => {
    		if ('windowWidth' in $$props) $$invalidate(12, windowWidth = $$props.windowWidth);
    		if ('windowHeight' in $$props) windowHeight = $$props.windowHeight;
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
    		if ('_progress' in $$props) $$invalidate(6, _progress = $$props._progress);
    		if ('progressFrame' in $$props) progressFrame = $$props.progressFrame;
    		if ('progressChangeStart' in $$props) progressChangeStart = $$props.progressChangeStart;
    		if ('changeStatusBarColorTimeout' in $$props) $$invalidate(13, changeStatusBarColorTimeout = $$props.changeStatusBarColorTimeout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*$android, $animeOptionVisible, windowWidth, _showConfirm, $isFullViewed, changeStatusBarColorTimeout*/ 126977) {
    			{
    				if ($android) {
    					try {
    						let isOverlay = $animeOptionVisible && windowWidth >= 750 || _showConfirm || $isFullViewed;
    						clearTimeout(changeStatusBarColorTimeout);

    						if (isOverlay) {
    							JSBridge.changeStatusBarColor(true);
    						} else {
    							$$invalidate(13, changeStatusBarColorTimeout = setTimeout(
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
    		_showConfirm,
    		_isAlert,
    		_confirmTitle,
    		_confirmText,
    		_confirmLabel,
    		_cancelLabel,
    		_progress,
    		$listIsUpdating,
    		$listUpdateAvailable,
    		handleConfirmationConfirmed,
    		handleConfirmationCancelled,
    		updateList,
    		windowWidth,
    		changeStatusBarColorTimeout,
    		$isFullViewed,
    		$animeOptionVisible,
    		$android,
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

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
