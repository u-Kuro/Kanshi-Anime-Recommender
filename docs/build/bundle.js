
(function (l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
	'use strict';

	function noop() { }
	const identity = x => x;
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
	function component_subscribe(component, store, callback) {
		component.$$.on_destroy.push(subscribe(store, callback));
	}
	function null_to_empty(value) {
		return value == null ? '' : value;
	}
	function set_store_value(store, ret, value) {
		store.set(value);
		return ret;
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
				throw new Error('Cannot have duplicate keys in a keyed each');
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

	const android = writable(null);
	const lastAnimeUpdate = writable(null);

	const username = writable(null);
	const hiddenEntries = writable(null);

	const filterOptions = writable(null);
	const activeTagFilters = writable(null);
	const finalAnimeList = writable(null);
	const animeLoaderWorker$1 = writable(null);
	const dataStatus = writable(null);

	const autoUpdate = writable(null);
	const autoUpdateInterval = writable(null);
	const lastRunnedAutoUpdateDate = writable(null);

	const exportPathIsAvailable = writable(null);
	const autoExport = writable(null);
	const autoExportInterval = writable(null);
	const lastRunnedAutoExportDate = writable(null);

	const ytPlayers = writable([]);
	const autoPlay = writable(null);

	const initData = writable(true);
	const animeObserver = writable(null);
	const searchedAnimeKeyword = writable("");
	const toast = writable(null);
	const menuVisible = writable(false);
	const animeOptionVisible = writable(false);
	const openedAnimeOptionIdx = writable(null);
	const popupVisible = writable(false);
	const openedAnimePopupIdx = writable(null);
	const shouldGoBack = writable(true);
	// Reactive Functions
	const runUpdate = writable(null);
	const runExport = writable(null);
	const updateRecommendationList = writable(null);
	const updateFilters = writable(null);
	const loadAnime = writable(null);

	const isJsonObject = (obj) => {
		return Object.prototype.toString.call(obj) === "[object Object]"
	};

	const jsonIsEmpty = (obj) => {
		for (const key in obj) {
			return false;
		}
		return true;
	};

	function msToTime(duration) {
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
			if (millenium > 0) time.push(millenium === 1 ? `${millenium}mil` : `${millenium}mils`);
			if (decades > 0) time.push(decades === 1 ? `${decades}de` : `${decades}des`);
			if (years > 0) time.push(`${years}y`);
			if (months > 0) time.push(months === 1 ? `${months}mo` : `${months}mos`);
			if (weeks > 0) time.push(`${weeks}w`);
			if (days > 0) time.push(`${days}d`);
			if (hours > 0) time.push(`${hours}h`);
			if (minutes > 0) time.push(`${minutes}m`);
			if (seconds > 0) time.push(`${seconds}s`);
			return time.join(" ")
		} catch (e) {
			return
		}
	}

	function getMostVisibleElement(parent, childSelector, intersectionRatioThreshold = 0.5) {
		try {
			if (typeof parent === "string") parent = document.querySelector(parentSelector);
			var childElements = parent.querySelectorAll(childSelector);
			var mostVisibleElement = null;
			var highestVisibleRatio = 0;
			childElements.forEach((childElement) => {
				var parentRect = parent.getBoundingClientRect();
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
			console.error(ex);
			return
		}
	}

	const getChildIndex = (childElement) => {
		try {
			return Array.from(childElement.parentNode.children).indexOf(childElement);
		} catch (ex) {
			// console.error(ex)
			return
		}
	};

	const scrollToElement = (parent, target, position = 'top', behavior, offset = 0) => {
		try {
			let scrollAmount;
			if (parent === window) {
				scrollAmount = target.offsetTop;
			} else {
				if (typeof parent === "string") parent = document.querySelector(parent);
				if (typeof target === "string") target = document.querySelector(target);
				if (position === 'bottom') {
					scrollAmount = target.offsetTop + target.offsetHeight - parent.offsetHeight;
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
			console.error(ex);
			return
		}
	};

	const scrollToElementAmount = (parent, target, position = 'top') => {
		try {
			if (typeof parent === "string") parent = document.querySelector(parent);
			if (typeof target === "string") target = document.querySelector(target);
			if (position === 'bottom') {
				return target.offsetTop + target.offsetHeight - parent.offsetHeight;
			} else {
				let targetRect = target.getBoundingClientRect();
				let parentRect = parent.getBoundingClientRect();
				return targetRect.top - parentRect.top + parent.scrollTop;
			}
		} catch (ex) {
			console.error(ex);
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
			if (curDown) {
				if (axis.toLowerCase().includes('y'))
					element.scrollTop = curYPos - e.pageY + curScrollTop;
				if (axis.toLowerCase().includes('x'))
					element.scrollLeft = curXPos - e.pageX + curScrollLeft;
			}
		};

		let down = (e) => {
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

		let up = () => {
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

	/* src\components\Anime\AnimeGrid.svelte generated by Svelte v3.59.1 */

	const { Object: Object_1$1, console: console_1$2 } = globals;

	const file$9 = "src\\components\\Anime\\AnimeGrid.svelte";

	function get_each_context_2$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[23] = list[i];
		return child_ctx;
	}

	function get_each_context$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[23] = list[i];
		return child_ctx;
	}

	function get_each_context_1$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[26] = list[i];
		child_ctx[27] = list;
		child_ctx[28] = i;
		return child_ctx;
	}

	// (327:8) {:else}
	function create_else_block_1$2(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				div.textContent = "No Results";
				attr_dev(div, "class", "empty svelte-qyi7kc");
				add_location(div, file$9, 327, 12, 11901);
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
			source: "(327:8) {:else}",
			ctx
		});

		return block;
	}

	// (315:35) 
	function create_if_block_3$2(ctx) {
		let each_1_anchor;
		let each_value_2 = Array(/*renderedImgGridLimit*/ ctx[3]);
		validate_each_argument(each_value_2);
		let each_blocks = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks[i] = create_each_block_2$2(get_each_context_2$2(ctx, each_value_2, i));
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
			id: create_if_block_3$2.name,
			type: "if",
			source: "(315:35) ",
			ctx
		});

		return block;
	}

	// (245:8) {#if $finalAnimeList?.length}
	function create_if_block$4(ctx) {
		let each_blocks = [];
		let each_1_lookup = new Map();
		let t;
		let if_block_anchor;
		let each_value_1 = /*$finalAnimeList*/ ctx[2] || [];
		validate_each_argument(each_value_1);
		const get_key = ctx => /*anime*/ ctx[26].id;
		validate_each_keys(ctx, each_value_1, get_each_context_1$2, get_key);

		for (let i = 0; i < each_value_1.length; i += 1) {
			let child_ctx = get_each_context_1$2(ctx, each_value_1, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_1$2(key, child_ctx));
		}

		let if_block = /*$finalAnimeList*/ ctx[2]?.length && !/*shownAllInList*/ ctx[0] && create_if_block_1$3(ctx);

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
				if (dirty & /*getBriefInfo, $finalAnimeList, handleOpenPopup, getShownScore, $filterOptions, formatNumber, getCautionColor, getUserStatusColor, handleOpenOption, cancelOpenOption*/ 1014) {
					each_value_1 = /*$finalAnimeList*/ ctx[2] || [];
					validate_each_argument(each_value_1);
					validate_each_keys(ctx, each_value_1, get_each_context_1$2, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, t.parentNode, destroy_block, create_each_block_1$2, t, get_each_context_1$2);
				}

				if (/*$finalAnimeList*/ ctx[2]?.length && !/*shownAllInList*/ ctx[0]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_1$3(ctx);
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
			id: create_if_block$4.name,
			type: "if",
			source: "(245:8) {#if $finalAnimeList?.length}",
			ctx
		});

		return block;
	}

	// (316:12) {#each Array(renderedImgGridLimit) as _}
	function create_each_block_2$2(ctx) {
		let div1;
		let div0;
		let img;
		let t;

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				img = element("img");
				t = space();
				attr_dev(img, "class", "image-grid__card-thumb skeleton svelte-qyi7kc");
				attr_dev(img, "alt", "");
				set_style(img, "opacity", `0`);
				add_location(img, file$9, 318, 24, 11613);
				attr_dev(div0, "class", "shimmer svelte-qyi7kc");
				add_location(div0, file$9, 317, 20, 11566);
				attr_dev(div1, "class", "image-grid__card skeleton svelte-qyi7kc");
				add_location(div1, file$9, 316, 16, 11505);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				append_dev(div0, img);
				append_dev(div1, t);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) detach_dev(div1);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2$2.name,
			type: "each",
			source: "(316:12) {#each Array(renderedImgGridLimit) as _}",
			ctx
		});

		return block;
	}

	// (294:32) {:else}
	function create_else_block$2(ctx) {
		let t_value = (formatNumber(/*anime*/ ctx[26].weightedScore) || "N/A") + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*$finalAnimeList*/ 4 && t_value !== (t_value = (formatNumber(/*anime*/ ctx[26].weightedScore) || "N/A") + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(t);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$2.name,
			type: "else",
			source: "(294:32) {:else}",
			ctx
		});

		return block;
	}

	// (292:32) {#if $filterOptions}
	function create_if_block_2$2(ctx) {
		let t_value = (/*getShownScore*/ ctx[8](/*anime*/ ctx[26]) || "N/A") + "";
		let t;

		const block = {
			c: function create() {
				t = text(t_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*$finalAnimeList*/ 4 && t_value !== (t_value = (/*getShownScore*/ ctx[8](/*anime*/ ctx[26]) || "N/A") + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(t);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$2.name,
			type: "if",
			source: "(292:32) {#if $filterOptions}",
			ctx
		});

		return block;
	}

	// (246:12) {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}
	function create_each_block_1$2(key_1, ctx) {
		let div3;
		let div0;
		let img;
		let img_src_value;
		let t0;
		let span2;
		let span0;
		let t1_value = (/*anime*/ ctx[26].title || "N/A") + "";
		let t1;
		let t2;
		let span1;
		let div1;
		let i0;
		let i0_class_value;
		let t3;

		let t4_value = `${/*anime*/ ctx[26].format || "N/A"}${/*anime*/ ctx[26].episodes
			? " [" + /*anime*/ ctx[26].episodes + "]"
			: ""}` + "";

		let t4;
		let t5;
		let div2;
		let i1;
		let i1_class_value;
		let t6;
		let span2_copy_value_value;
		let div3_title_value;
		let each_value_1 = /*each_value_1*/ ctx[27];
		let animeIdx = /*animeIdx*/ ctx[28];
		let mounted;
		let dispose;

		function select_block_type_1(ctx, dirty) {
			if (/*$filterOptions*/ ctx[1]) return create_if_block_2$2;
			return create_else_block$2;
		}

		let current_block_type = select_block_type_1(ctx);
		let if_block = current_block_type(ctx);
		const assign_div3 = () => /*div3_binding*/ ctx[10](div3, each_value_1, animeIdx);
		const unassign_div3 = () => /*div3_binding*/ ctx[10](null, each_value_1, animeIdx);

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div3 = element("div");
				div0 = element("div");
				img = element("img");
				t0 = space();
				span2 = element("span");
				span0 = element("span");
				t1 = text(t1_value);
				t2 = space();
				span1 = element("span");
				div1 = element("div");
				i0 = element("i");
				t3 = space();
				t4 = text(t4_value);
				t5 = space();
				div2 = element("div");
				i1 = element("i");
				t6 = space();
				if_block.c();
				attr_dev(img, "class", "image-grid__card-thumb svelte-qyi7kc");
				attr_dev(img, "alt", "anime-cover");
				if (!src_url_equal(img.src, img_src_value = /*anime*/ ctx[26].coverImageUrl)) attr_dev(img, "src", img_src_value);
				set_style(img, "opacity", `0`);
				add_location(img, file$9, 252, 24, 8405);
				attr_dev(div0, "class", "shimmer svelte-qyi7kc");
				add_location(div0, file$9, 251, 20, 8358);
				attr_dev(span0, "class", "title svelte-qyi7kc");
				add_location(span0, file$9, 271, 24, 9401);
				attr_dev(i0, "class", i0_class_value = "" + (null_to_empty(`${/*getUserStatusColor*/ ctx[9](/*anime*/ ctx[26].userStatus)}-color fa-solid fa-circle`) + " svelte-qyi7kc"));
				add_location(i0, file$9, 274, 32, 9589);
				attr_dev(div1, "class", "brief-info svelte-qyi7kc");
				add_location(div1, file$9, 273, 28, 9531);
				attr_dev(i1, "class", i1_class_value = "" + (null_to_empty(`${getCautionColor$1(/*anime*/ ctx[26])}-color fa-solid fa-star`) + " svelte-qyi7kc"));
				add_location(i1, file$9, 286, 32, 10211);
				attr_dev(div2, "class", "brief-info svelte-qyi7kc");
				add_location(div2, file$9, 285, 28, 10153);
				attr_dev(span1, "class", "brief-info svelte-qyi7kc");
				add_location(span1, file$9, 272, 24, 9476);
				attr_dev(span2, "class", "image-grid__card-title copy svelte-qyi7kc");
				attr_dev(span2, "copy-value", span2_copy_value_value = /*anime*/ ctx[26].title || "");
				add_location(span2, file$9, 265, 20, 9104);
				attr_dev(div3, "class", "image-grid__card svelte-qyi7kc");
				attr_dev(div3, "title", div3_title_value = /*getBriefInfo*/ ctx[7](/*anime*/ ctx[26]));
				add_location(div3, file$9, 246, 16, 8167);
				this.first = div3;
			},
			m: function mount(target, anchor) {
				insert_dev(target, div3, anchor);
				append_dev(div3, div0);
				append_dev(div0, img);
				append_dev(div3, t0);
				append_dev(div3, span2);
				append_dev(span2, span0);
				append_dev(span0, t1);
				append_dev(span2, t2);
				append_dev(span2, span1);
				append_dev(span1, div1);
				append_dev(div1, i0);
				append_dev(div1, t3);
				append_dev(div1, t4);
				append_dev(span1, t5);
				append_dev(span1, div2);
				append_dev(div2, i1);
				append_dev(div2, t6);
				if_block.m(div2, null);
				assign_div3();

				if (!mounted) {
					dispose = [
						listen_dev(img, "load", load_handler$1, false, false, false, false),
						listen_dev(
							img,
							"click",
							function () {
								if (is_function(/*handleOpenPopup*/ ctx[4](/*animeIdx*/ ctx[28]))) /*handleOpenPopup*/ ctx[4](/*animeIdx*/ ctx[28]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							img,
							"pointerdown",
							function () {
								if (is_function(/*handleOpenOption*/ ctx[5](/*animeIdx*/ ctx[28]))) /*handleOpenOption*/ ctx[5](/*animeIdx*/ ctx[28]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(img, "pointerup", /*cancelOpenOption*/ ctx[6], false, false, false, false),
						listen_dev(img, "pointercancel", /*cancelOpenOption*/ ctx[6], false, false, false, false),
						listen_dev(
							img,
							"keydown",
							function () {
								if (is_function(/*handleOpenPopup*/ ctx[4](/*animeIdx*/ ctx[28]))) /*handleOpenPopup*/ ctx[4](/*animeIdx*/ ctx[28]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							span2,
							"click",
							function () {
								if (is_function(/*handleOpenPopup*/ ctx[4](/*animeIdx*/ ctx[28]))) /*handleOpenPopup*/ ctx[4](/*animeIdx*/ ctx[28]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							span2,
							"keydown",
							function () {
								if (is_function(/*handleOpenPopup*/ ctx[4](/*animeIdx*/ ctx[28]))) /*handleOpenPopup*/ ctx[4](/*animeIdx*/ ctx[28]).apply(this, arguments);
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

				if (dirty & /*$finalAnimeList*/ 4 && !src_url_equal(img.src, img_src_value = /*anime*/ ctx[26].coverImageUrl)) {
					attr_dev(img, "src", img_src_value);
				}

				if (dirty & /*$finalAnimeList*/ 4 && t1_value !== (t1_value = (/*anime*/ ctx[26].title || "N/A") + "")) set_data_dev(t1, t1_value);

				if (dirty & /*$finalAnimeList*/ 4 && i0_class_value !== (i0_class_value = "" + (null_to_empty(`${/*getUserStatusColor*/ ctx[9](/*anime*/ ctx[26].userStatus)}-color fa-solid fa-circle`) + " svelte-qyi7kc"))) {
					attr_dev(i0, "class", i0_class_value);
				}

				if (dirty & /*$finalAnimeList*/ 4 && t4_value !== (t4_value = `${/*anime*/ ctx[26].format || "N/A"}${/*anime*/ ctx[26].episodes
					? " [" + /*anime*/ ctx[26].episodes + "]"
					: ""}` + "")) set_data_dev(t4, t4_value);

				if (dirty & /*$finalAnimeList*/ 4 && i1_class_value !== (i1_class_value = "" + (null_to_empty(`${getCautionColor$1(/*anime*/ ctx[26])}-color fa-solid fa-star`) + " svelte-qyi7kc"))) {
					attr_dev(i1, "class", i1_class_value);
				}

				if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div2, null);
					}
				}

				if (dirty & /*$finalAnimeList*/ 4 && span2_copy_value_value !== (span2_copy_value_value = /*anime*/ ctx[26].title || "")) {
					attr_dev(span2, "copy-value", span2_copy_value_value);
				}

				if (dirty & /*$finalAnimeList*/ 4 && div3_title_value !== (div3_title_value = /*getBriefInfo*/ ctx[7](/*anime*/ ctx[26]))) {
					attr_dev(div3, "title", div3_title_value);
				}

				if (each_value_1 !== /*each_value_1*/ ctx[27] || animeIdx !== /*animeIdx*/ ctx[28]) {
					unassign_div3();
					each_value_1 = /*each_value_1*/ ctx[27];
					animeIdx = /*animeIdx*/ ctx[28];
					assign_div3();
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(div3);
				if_block.d();
				unassign_div3();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1$2.name,
			type: "each",
			source: "(246:12) {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}",
			ctx
		});

		return block;
	}

	// (302:12) {#if $finalAnimeList?.length && !shownAllInList}
	function create_if_block_1$3(ctx) {
		let each_1_anchor;
		let each_value = Array(1);
		validate_each_argument(each_value);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
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
			id: create_if_block_1$3.name,
			type: "if",
			source: "(302:12) {#if $finalAnimeList?.length && !shownAllInList}",
			ctx
		});

		return block;
	}

	// (303:16) {#each Array(1) as _}
	function create_each_block$2(ctx) {
		let div1;
		let div0;
		let img;
		let t;

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				img = element("img");
				t = space();
				attr_dev(img, "class", "image-grid__card-thumb skeleton svelte-qyi7kc");
				attr_dev(img, "alt", "");
				set_style(img, "opacity", `0`);
				add_location(img, file$9, 305, 28, 11092);
				attr_dev(div0, "class", "shimmer svelte-qyi7kc");
				add_location(div0, file$9, 304, 24, 11041);
				attr_dev(div1, "class", "image-grid__card skeleton svelte-qyi7kc");
				add_location(div1, file$9, 303, 20, 10976);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				append_dev(div0, img);
				append_dev(div1, t);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) detach_dev(div1);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$2.name,
			type: "each",
			source: "(303:16) {#each Array(1) as _}",
			ctx
		});

		return block;
	}

	function create_fragment$a(ctx) {
		let main;
		let div;

		function select_block_type(ctx, dirty) {
			if (/*$finalAnimeList*/ ctx[2]?.length) return create_if_block$4;
			if (!/*$finalAnimeList*/ ctx[2]) return create_if_block_3$2;
			return create_else_block_1$2;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		const block = {
			c: function create() {
				main = element("main");
				div = element("div");
				if_block.c();
				attr_dev(div, "id", "anime-grid");
				attr_dev(div, "class", "image-grid svelte-qyi7kc");
				add_location(div, file$9, 243, 4, 7997);
				attr_dev(main, "class", "svelte-qyi7kc");
				add_location(main, file$9, 242, 0, 7985);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, main, anchor);
				append_dev(main, div);
				if_block.m(div, null);
			},
			p: function update(ctx, [dirty]) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div, null);
					}
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) detach_dev(main);
				if_block.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$a.name,
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
		} else if (score < meanScoreAll) {
			// Very Low Score
			return "purple";
		} else if (score < meanScoreAbove) {
			// Low Score
			return "orange";
		} else if (contentCaution?.semiCaution?.length) {
			// Semi Caution
			return "teal";
		} else {
			return "green";
		}
	}

	const load_handler$1 = e => e.target.style.opacity = 1;

	function instance$a($$self, $$props, $$invalidate) {
		let $filterOptions;
		let $animeOptionVisible;
		let $openedAnimeOptionIdx;
		let $popupVisible;
		let $openedAnimePopupIdx;
		let $animeLoaderWorker;
		let $animeObserver;
		let $finalAnimeList;
		let $dataStatus;
		validate_store(filterOptions, 'filterOptions');
		component_subscribe($$self, filterOptions, $$value => $$invalidate(1, $filterOptions = $$value));
		validate_store(animeOptionVisible, 'animeOptionVisible');
		component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(14, $animeOptionVisible = $$value));
		validate_store(openedAnimeOptionIdx, 'openedAnimeOptionIdx');
		component_subscribe($$self, openedAnimeOptionIdx, $$value => $$invalidate(15, $openedAnimeOptionIdx = $$value));
		validate_store(popupVisible, 'popupVisible');
		component_subscribe($$self, popupVisible, $$value => $$invalidate(16, $popupVisible = $$value));
		validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
		component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(17, $openedAnimePopupIdx = $$value));
		validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
		component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(18, $animeLoaderWorker = $$value));
		validate_store(animeObserver, 'animeObserver');
		component_subscribe($$self, animeObserver, $$value => $$invalidate(19, $animeObserver = $$value));
		validate_store(finalAnimeList, 'finalAnimeList');
		component_subscribe($$self, finalAnimeList, $$value => $$invalidate(2, $finalAnimeList = $$value));
		validate_store(dataStatus, 'dataStatus');
		component_subscribe($$self, dataStatus, $$value => $$invalidate(20, $dataStatus = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('AnimeGrid', slots, []);
		let renderedImgGridLimit = 20;
		let shownAllInList = false;
		let observerTimeout;
		let observerDelay = 1000;

		function addObserver() {
			set_store_value(
				animeObserver,
				$animeObserver = new IntersectionObserver((entries, self) => {
					entries.forEach(entry => {
						if (entry.isIntersecting) {
							self.unobserve(entry.target);
							if (observerTimeout) clearTimeout(observerTimeout);

							observerTimeout = setTimeout(
								() => {
									$animeLoaderWorker.postMessage({
										loadMore: true,
										shownAnimeLen: $finalAnimeList.length
									});
								},
								observerDelay
							);
						}
					});
				},
					{
						root: null,
						rootMargin: "100%",
						threshold: 0
					}),
				$animeObserver
			);
		}

		animeLoaderWorker$1.subscribe(val => {
			if (val instanceof Worker) {
				val.onmessage = ({ data }) => {
					if (data?.status !== undefined) set_store_value(dataStatus, $dataStatus = data.status, $dataStatus); else if (data.finalAnimeList instanceof Array && $finalAnimeList instanceof Array) {
						if (data.isNew === true) {
							set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
						} else if (data.isNew === false) {
							set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList.concat(data.finalAnimeList), $finalAnimeList);

							if (data.isLast) {
								$$invalidate(0, shownAllInList = true);

								if ($animeObserver) {
									$animeObserver.disconnect();
									set_store_value(animeObserver, $animeObserver = null, $animeObserver);
								}
							}
						}
					} else if (data.isRemoved === true && typeof data.removedID === "number") {
						set_store_value(finalAnimeList, $finalAnimeList = $finalAnimeList.filter(({ id }) => id !== data.removedID), $finalAnimeList);
					}
				};

				val.onerror = error => {
					console.error(error);
				};
			}
		});

		finalAnimeList.subscribe(val => {
			if (val instanceof Array && val.length) {
				if ($animeObserver) {
					$animeObserver.disconnect();
					set_store_value(animeObserver, $animeObserver = null, $animeObserver);
				}

				if ($finalAnimeList.length && !shownAllInList) {
					(async () => {
						addObserver();
						await tick();

						// Grid Observed
						try {
							$animeObserver.observe($finalAnimeList[$finalAnimeList.length - 1].gridElement);
						} catch (ex) {

						}
					})();
				}
			} else {
				if ($animeObserver) {
					$animeObserver.disconnect();
					set_store_value(animeObserver, $animeObserver = null, $animeObserver);
				}
			}
		});

		searchedAnimeKeyword.subscribe(async val => {
			if (typeof val === "string" && $animeLoaderWorker instanceof Worker) {
				$$invalidate(0, shownAllInList = false);
				$animeLoaderWorker.postMessage({ filterKeyword: val });
			}
		});

		function handleOpenPopup(animeIdx) {
			set_store_value(openedAnimePopupIdx, $openedAnimePopupIdx = animeIdx, $openedAnimePopupIdx);
			set_store_value(popupVisible, $popupVisible = true, $popupVisible);
		}

		let openOptionTimeout, openOptionIsLongPressed;

		function handleOpenOption(animeIdx) {
			if (openOptionTimeout) clearTimeout(openOptionTimeout);
			openOptionIsLongPressed = true;

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
			openOptionIsLongPressed = false;
		}

		function getBriefInfo({ contentCaution, favoriteContents, meanScoreAll, meanScoreAbove, score }) {
			let _favoriteContents = [];

			favoriteContents?.forEach(e => {
				if (isJsonObject(e)) {
					_favoriteContents.push(Object.keys(e)[0]);
				} else if (typeof e === "string") {
					_favoriteContents.push(e);
				}
			});

			let _contentCaution = (contentCaution?.caution || []).concat(contentCaution?.semiCaution || []);

			if (score < meanScoreAll) {
				// Very Low Score
				_contentCaution.push(`Very Low Score (mean: ${formatNumber(meanScoreAll)})`);
			} else if (score < meanScoreAbove) {
				// Low Score
				_contentCaution.push(`Low Score (mean: ${formatNumber(meanScoreAbove)})`);
			}

			let briefInfo = "";

			if (_favoriteContents.length) {
				briefInfo += "Favorite Contents: " + _favoriteContents.join(", ") || "";
			}

			if (_contentCaution.length) {
				briefInfo += "\n\nContent Cautions: " + _contentCaution.join(", ");
			}

			return briefInfo;
		}

		function getShownScore({ weightedScore, score, averageScore, userScore }) {
			let sortName = $filterOptions?.sortFilter.filter(({ sortType }) => sortType !== "none")?.[0]?.sortName;

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

		const writable_props = [];

		Object_1$1.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<AnimeGrid> was created with unknown prop '${key}'`);
		});

		function div3_binding($$value, each_value_1, animeIdx) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				each_value_1[animeIdx].gridElement = $$value;
			});
		}

		$$self.$capture_state = () => ({
			tick,
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
			formatNumber,
			ncsCompare,
			isJsonObject,
			jsonIsEmpty,
			renderedImgGridLimit,
			shownAllInList,
			observerTimeout,
			observerDelay,
			addObserver,
			handleOpenPopup,
			openOptionTimeout,
			openOptionIsLongPressed,
			handleOpenOption,
			cancelOpenOption,
			getBriefInfo,
			getShownScore,
			getCautionColor: getCautionColor$1,
			getUserStatusColor,
			$filterOptions,
			$animeOptionVisible,
			$openedAnimeOptionIdx,
			$popupVisible,
			$openedAnimePopupIdx,
			$animeLoaderWorker,
			$animeObserver,
			$finalAnimeList,
			$dataStatus
		});

		$$self.$inject_state = $$props => {
			if ('renderedImgGridLimit' in $$props) $$invalidate(3, renderedImgGridLimit = $$props.renderedImgGridLimit);
			if ('shownAllInList' in $$props) $$invalidate(0, shownAllInList = $$props.shownAllInList);
			if ('observerTimeout' in $$props) observerTimeout = $$props.observerTimeout;
			if ('observerDelay' in $$props) observerDelay = $$props.observerDelay;
			if ('openOptionTimeout' in $$props) openOptionTimeout = $$props.openOptionTimeout;
			if ('openOptionIsLongPressed' in $$props) openOptionIsLongPressed = $$props.openOptionIsLongPressed;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			shownAllInList,
			$filterOptions,
			$finalAnimeList,
			renderedImgGridLimit,
			handleOpenPopup,
			handleOpenOption,
			cancelOpenOption,
			getBriefInfo,
			getShownScore,
			getUserStatusColor,
			div3_binding
		];
	}

	class AnimeGrid extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "AnimeGrid",
				options,
				id: create_fragment$a.name
			});
		}
	}

	let terminateDelay = 1000;
	let dataStatusPrio = false;
	let animeLoaderWorker;
	const animeLoader = (_data) => {
		dataStatusPrio = true;
		return new Promise((resolve, reject) => {
			if (animeLoaderWorker) animeLoaderWorker.terminate();
			animeLoaderWorker = new Worker("./webapi/worker/animeLoader.js");
			animeLoaderWorker.postMessage(_data);
			animeLoaderWorker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
					dataStatusPrio = true;
					dataStatus.set(data.status);
				} else {
					dataStatusPrio = false;
					animeLoaderWorker.onmessage = null;
					resolve({ finalAnimeList: data.finalAnimeList, animeLoaderWorker });

				}
			};
			animeLoaderWorker.onerror = (error) => {
				reject(error);
			};
		})
	};
	let processRecommendedAnimeListTerminateTimeout;
	let processRecommendedAnimeListWorker;
	const processRecommendedAnimeList = (_data) => {
		dataStatusPrio = true;
		return new Promise((resolve, reject) => {
			if (processRecommendedAnimeListWorker) processRecommendedAnimeListWorker.terminate();
			processRecommendedAnimeListWorker = new Worker("./webapi/worker/processRecommendedAnimeList.js");
			if (processRecommendedAnimeListTerminateTimeout) clearTimeout(processRecommendedAnimeListTerminateTimeout);
			processRecommendedAnimeListWorker.postMessage(_data);
			processRecommendedAnimeListWorker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
					dataStatusPrio = true;
					dataStatus.set(data.status);
				} else {
					dataStatusPrio = false;
					processRecommendedAnimeListTerminateTimeout = setTimeout(() => {
						processRecommendedAnimeListWorker.terminate();
					}, terminateDelay);
					updateFilters.update(e => !e);
					loadAnime.update(e => !e);
				}
			};
			processRecommendedAnimeListWorker.onerror = (error) => {
				reject(error);
			};
		});
	};
	let requestAnimeEntriesTerminateTimeout, requestAnimeEntriesWorker;
	const requestAnimeEntries = (_data) => {
		return new Promise((resolve, reject) => {
			if (requestAnimeEntriesWorker) requestAnimeEntriesWorker.terminate();
			requestAnimeEntriesWorker = new Worker("./webapi/worker/requestAnimeEntries.js");
			if (requestAnimeEntriesTerminateTimeout) clearTimeout(requestAnimeEntriesTerminateTimeout);
			requestAnimeEntriesWorker.postMessage(_data);
			requestAnimeEntriesWorker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
					if (!dataStatusPrio) {
						dataStatus.set(data.status);
					}
				} else if (data?.updateRecommendationList !== undefined) {
					updateRecommendationList.update(e => !e);
				} else {
					requestAnimeEntriesTerminateTimeout = setTimeout(() => {
						requestAnimeEntriesWorker.terminate();
					}, terminateDelay);
					resolve(data);
				}
			};
			requestAnimeEntriesWorker.onerror = (error) => {
				reject(error);
			};
		})
	};
	let requestUserEntriesTerminateTimeout, requestUserEntriesWorker;
	const requestUserEntries = (_data) => {
		return new Promise((resolve, reject) => {
			if (requestUserEntriesWorker) requestUserEntriesWorker.terminate();
			requestUserEntriesWorker = new Worker("./webapi/worker/requestUserEntries.js");
			if (requestUserEntriesTerminateTimeout) clearTimeout(requestUserEntriesTerminateTimeout);
			requestUserEntriesWorker.postMessage(_data);
			requestUserEntriesWorker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
					if (!dataStatusPrio) {
						dataStatus.set(data.status);
					}
				} else if (data?.updateRecommendationList !== undefined) {
					updateRecommendationList.update(e => !e);
				} else {
					requestUserEntriesTerminateTimeout = setTimeout(() => {
						requestUserEntriesWorker.terminate();
					}, terminateDelay);
					resolve(data);
				}

			};
			requestUserEntriesWorker.onerror = (error) => {
				reject(error);
			};
		})
	};

	let exportUserDataWorker;
	const exportUserData = (_data) => {
		return new Promise((resolve, reject) => {
			if (exportUserDataWorker) exportUserDataWorker.terminate();
			exportUserDataWorker = new Worker("./webapi/worker/exportUserData.js");
			if (isAndroid()) {
				exportUserDataWorker.postMessage('android');
			} else {
				exportUserDataWorker.postMessage('browser');
			}
			exportUserDataWorker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
					dataStatusPrio = true;
					dataStatus.set(data.status);
				} else if (isAndroid()) {
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
						JSBridge.exportJSON(chunk, 2, `Kanshi.${username.toLowerCase() || "Backup"}.json`);
						exportUserDataWorker.terminate();
						resolve(data);
					}
				} else {
					dataStatusPrio = false;
					let username = data.username ?? null;
					downloadLink(data.url, `Kanshi.${username.toLowerCase() || "Backup"}.json`);
					resolve(data);
					// dont terminate, can't oversee blob link lifetime
				}
			};
			exportUserDataWorker.onerror = (error) => {
				reject(error);
			};
		})
	};
	let importUserDataTerminateTimeout, importUserDataWorker;
	const importUserData = (_data) => {
		return new Promise((resolve, reject) => {
			if (importUserDataWorker) importUserDataWorker.terminate();
			importUserDataWorker = new Worker("./webapi/worker/importUserData.js");
			if (importUserDataTerminateTimeout) clearTimeout(importUserDataTerminateTimeout);
			importUserDataWorker.postMessage(_data);
			importUserDataWorker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
					dataStatusPrio = true;
					dataStatus.set(data.status);
				} else if (typeof data?.importedUsername === "string") {
					username.set(data.importedUsername);
				} else if (data?.updateFilters !== undefined) {
					updateFilters.update(e => !e);
				} else if (data?.updateRecommendationList !== undefined) {
					updateRecommendationList.update(e => !e);
				} else {
					dataStatusPrio = false;
					importUserDataTerminateTimeout = setTimeout(() => {
						importUserDataWorker.terminate();
					}, terminateDelay);
					resolve(data);
				}

			};
			importUserDataWorker.onerror = (error) => {
				reject(error);
			};
		})
	};

	// IndexedDB
	const getIDBdata = (name) => {
		let worker = new Worker("./webapi/worker/getIDBdata.js");
		return new Promise((resolve, reject) => {
			worker.postMessage({ name: name });
			worker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
					dataStatus.set(data.status);
				} else {
					worker.terminate();
					resolve(data);
				}
			};
			worker.onerror = (error) => {
				reject(error);
			};
		})
	};
	const saveIDBdata = (data, name) => {
		return new Promise((resolve, reject) => {
			let worker = new Worker("./webapi/worker/saveIDBdata.js");
			worker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
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
			worker.postMessage({ data: data, name: name });
		})
	};

	// One Time Use
	let getAnimeEntriesTerminateTimeout;
	const getAnimeEntries = (_data) => {
		return new Promise((resolve, reject) => {
			let worker = new Worker("./webapi/worker/getAnimeEntries.js");
			if (getAnimeEntriesTerminateTimeout) clearTimeout(getAnimeEntriesTerminateTimeout);
			worker.postMessage(_data);
			worker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
					dataStatusPrio = true;
					dataStatus.set(data.status);
				} else {
					dataStatusPrio = false;
					updateRecommendationList.update(e => !e);
					getAnimeEntriesTerminateTimeout = setTimeout(() => {
						worker.terminate();
					}, terminateDelay);
					resolve(data);
				}
			};
			worker.onerror = (error) => {
				reject(error);
			};
		})
	};

	let getAnimeFranchisesTerminateTimeout;
	const getAnimeFranchises = (_data) => {
		return new Promise((resolve, reject) => {
			let worker = new Worker("./webapi/worker/getAnimeFranchises.js");
			if (getAnimeFranchisesTerminateTimeout) clearTimeout(getAnimeFranchisesTerminateTimeout);
			worker.postMessage(_data);
			worker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
					dataStatusPrio = true;
					dataStatus.set(data.status);
				} else {
					updateRecommendationList.update(e => !e);
					dataStatusPrio = false;
					getAnimeFranchisesTerminateTimeout = setTimeout(() => {
						worker.terminate();
					}, terminateDelay);
					resolve(data);
				}
			};
			worker.onerror = (error) => {
				reject(error);
			};
		})
	};

	let getFilterOptionsTerminateTimeout;
	const getFilterOptions = (_data) => {
		return new Promise((resolve, reject) => {
			let worker = new Worker("./webapi/worker/getFilterOptions.js");
			if (getFilterOptionsTerminateTimeout) clearTimeout(getFilterOptionsTerminateTimeout);
			worker.postMessage(_data);
			worker.onmessage = ({ data }) => {
				if (data?.status !== undefined) {
					dataStatusPrio = true;
					dataStatus.set(data.status);
				} else {
					dataStatusPrio = false;
					getFilterOptionsTerminateTimeout = setTimeout(() => {
						worker.terminate();
					}, terminateDelay);
					resolve(data);
				}
			};
			worker.onerror = (error) => {
				reject(error);
			};
		})
	};

	let db;
	async function IDBinit() {
		return await new Promise((resolve) => {
			let request = indexedDB.open("Kanshi.Anime.Recommendations.Anilist.W~uPtWCq=vG$TR:Zl^#t<vdS]I~N70", 1);
			request.onerror = (error) => {
				alert("Your browser is not supported, to continue please update to recent version, use non private/incognito, or use another browser.");
				console.error(error);
			};
			request.onsuccess = (event) => {
				db = event.target.result;
				return resolve(db)
			};
			request.onupgradeneeded = (event) => {
				db = event.target.result;
				db.createObjectStore("MyObjectStore");
				return resolve(db)
			};
		})
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

	function alter(element_s, parameters = {}) {
		// Initialize Element(s)
		if (element_s instanceof Window || element_s instanceof Element || element_s instanceof Document) {
			element_s = [element_s];
		} else if (typeof element_s === "string" || element_s instanceof String) {
			element_s = document.querySelectorAll(element_s);
			if (element_s.length === 0) { return }
			else { element_s = Array.from(element_s); }
		} else if (!(element_s instanceof HTMLCollection) && !(element_s instanceof NodeList)) { return }
		// Apply parameters
		if (typeof parameters['keyframes'] !== "undefined" || typeof parameters['keyframe'] !== "undefined") {
			const options = { duration: 200, fill: "forwards", easing: 'ease' }; // DEFAULTS
			let animations = [];
			for (const key in parameters) {
				if (key === 'keyframes' || key === 'keyframe' || key === 'styles' || key === 'style') continue
				options[key] = parameters[key];
			}
			const keyframes = parameters['keyframes'] || parameters['keyframe'];
			if (typeof options['duration'] === 'number') {
				if (keyframes instanceof Array) {
					for (let i = 0; i < element_s.length; i++) {
						if (isNativeAnimateFunction(element_s[i])) {
							animations.push([element_s[i].animate(keyframes, options), element_s[i]]);
						}
					}
				}
			}
			if (parameters['onfinish'] === undefined) {
				const lastkeyframe = keyframes.slice(-1)[0];
				animations.forEach(([animation, element], idx) => {
					animation.onfinish = () => {
						Object.assign(element.style, lastkeyframe);
						animation.cancel();
						if (idx === animations.length - 1 && typeof parameters['callback'] === 'function') {
							parameters['callback']();
						}
					};
				});
			}
			animations = animations.map(animation => animation[0]);
			return animations.length === 1 ? animations[0] : animations
		} else if (typeof parameters['styles'] !== "undefined" || typeof parameters['style'] !== "undefined") {
			const styles = parameters?.styles || parameters?.style;
			if (styles) {
				for (let i = 0; i < element_s.length; i++) {
					if (isNativeStyleProperty(element_s[i])) {
						Object.assign(element_s[i].style, styles);
					}
				}
			}
			return element_s;
		} else { return }
		// return element(s)

		// Helper function
		function isNativeAnimateFunction(element) {
			return Element.prototype.animate.toString() === element?.animate?.toString?.();
		}
		function isNativeStyleProperty(element) {
			return element?.style instanceof CSSStyleDeclaration;
		}
	}

	if (typeof module !== "undefined" && typeof module?.exports !== 'undefined') { module.exports = alter; }

	function captureSlideEvent(targetElement, callback = new Function) {
		// Slides
		var startX;
		var endX;
		// var startY;
		// var endY;
		var pointerId;
		var isPointerDown = false;

		targetElement.addEventListener('pointerdown', down);
		targetElement.addEventListener('pointerup', up);
		targetElement.addEventListener('pointercancel', cancel);

		function move(event) {
			if (event.pointerId === pointerId && isPointerDown) {
				endX = event.clientX;
				const deltaX = endX - startX;
				if (deltaX >= 50) {
					alter(targetElement, {
						keyframes: [
							{ transform: `translateX(${deltaX}px)` },
						]
					});
				}
			} else {
				targetElement.removeEventListener('pointermove', move);
				slideCallback('none', targetElement);
			}
		}
		function up(event) {
			targetElement.removeEventListener('pointermove', move);
			if (event.pointerId === pointerId && isPointerDown) {
				endX = event.clientX;
				var targetElementRect = targetElement.getBoundingClientRect();
				var targetHeight = Math.min(targetElementRect.width, window.innerWidth);
				var xThreshold = targetHeight * 0.4;
				var deltaX = endX - startX;
				// var slopeX = Math.abs(deltaX);
				if (deltaX >= xThreshold) {
					slideCallback('slideRight', targetElement);
				} else {
					slideCallback('none', targetElement);
				}
				releasePointer();
			}

		}
		function down(event) {
			if (event.pointerType === "mouse") return
			startX = event.clientX;
			pointerId = event.pointerId;
			targetElement.setPointerCapture(pointerId);
			isPointerDown = true;
			targetElement.addEventListener('pointermove', move);
		}
		function cancel(event) {
			targetElement.removeEventListener('pointermove', move);
			if (event.pointerId === pointerId && isPointerDown) {
				slideCallback('none', targetElement);
				releasePointer();
			}
		}
		function releasePointer() {
			targetElement.releasePointerCapture(pointerId);
			isPointerDown = false;
		}

		function slideCallback(type, targetElement) {
			// Handle slide events as needed
			if (type === "slideRight") {
				alter(targetElement, {
					keyframes: [
						{ transform: `translateX(${window.innerWidth}px)` }
					],
					callback: () => {
						callback().then(() => {
							alter(targetElement, {
								styles: {
									transform: ``
								}
							});
						});
					}
				});
			} else if (type === "none") {
				alter(targetElement, {
					keyframes: [
						{ transform: `` },
					]
				});
			}
		}
		return () => {
			targetElement.removeEventListener('pointerdown', down);
			targetElement.removeEventListener('pointerup', up);
			targetElement.removeEventListener('pointermove', move);
			targetElement.removeEventListener('pointercancel', cancel);
		}
	}

	/* src\components\Anime\Fixed\AnimePopup.svelte generated by Svelte v3.59.1 */

	const { Object: Object_1 } = globals;
	const file$8 = "src\\components\\Anime\\Fixed\\AnimePopup.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[27] = list[i];
		child_ctx[28] = list;
		child_ctx[29] = i;
		return child_ctx;
	}

	function get_each_context_1$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[30] = list[i];
		child_ctx[32] = i;
		return child_ctx;
	}

	function get_each_context_2$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[33] = list[i];
		child_ctx[32] = i;
		return child_ctx;
	}

	function get_each_context_3$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[35] = list[i][0];
		child_ctx[36] = list[i][1];
		return child_ctx;
	}

	function get_each_context_4$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[39] = list[i];
		child_ctx[32] = i;
		return child_ctx;
	}

	function get_each_context_5$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[35] = list[i][0];
		child_ctx[36] = list[i][1];
		child_ctx[42] = i;
		return child_ctx;
	}

	// (477:20) {#if anime.trailerID}
	function create_if_block_7$1(ctx) {
		let div1;
		let div0;
		let each_value = /*each_value*/ ctx[28];
		let animeIdx = /*animeIdx*/ ctx[29];
		const assign_div1 = () => /*div1_binding*/ ctx[10](div1, each_value, animeIdx);
		const unassign_div1 = () => /*div1_binding*/ ctx[10](null, each_value, animeIdx);

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				attr_dev(div0, "class", "trailer");
				add_location(div0, file$8, 481, 28, 17803);
				attr_dev(div1, "class", "popup-trailer svelte-kbzda9");
				add_location(div1, file$8, 477, 24, 17631);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				assign_div1();
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (each_value !== /*each_value*/ ctx[28] || animeIdx !== /*animeIdx*/ ctx[29]) {
					unassign_div1();
					each_value = /*each_value*/ ctx[28];
					animeIdx = /*animeIdx*/ ctx[29];
					assign_div1();
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(div1);
				unassign_div1();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_7$1.name,
			type: "if",
			source: "(477:20) {#if anime.trailerID}",
			ctx
		});

		return block;
	}

	// (568:36) {:else}
	function create_else_block_3$1(ctx) {
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
			id: create_else_block_3$1.name,
			type: "else",
			source: "(568:36) {:else}",
			ctx
		});

		return block;
	}

	// (548:36) {#if Object.entries(anime?.studios || {}).length}
	function create_if_block_5$1(ctx) {
		let each_blocks = [];
		let each_1_lookup = new Map();
		let each_1_anchor;
		let each_value_5 = Object.entries(/*anime*/ ctx[27].studios || {});
		validate_each_argument(each_value_5);
		const get_key = ctx => /*studio*/ ctx[35];
		validate_each_keys(ctx, each_value_5, get_each_context_5$1, get_key);

		for (let i = 0; i < each_value_5.length; i += 1) {
			let child_ctx = get_each_context_5$1(ctx, each_value_5, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_5$1(key, child_ctx));
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
				if (dirty[0] & /*$finalAnimeList*/ 4) {
					each_value_5 = Object.entries(/*anime*/ ctx[27].studios || {});
					validate_each_argument(each_value_5);
					validate_each_keys(ctx, each_value_5, get_each_context_5$1, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_5, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block_5$1, each_1_anchor, get_each_context_5$1);
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
			id: create_if_block_5$1.name,
			type: "if",
			source: "(548:36) {#if Object.entries(anime?.studios || {}).length}",
			ctx
		});

		return block;
	}

	// (550:44) {#if studio}
	function create_if_block_6$1(ctx) {
		let a;

		let t_value = /*studio*/ ctx[35] + (Object.entries(/*anime*/ ctx[27]?.studios || {}).length - 1 > /*studioIdx*/ ctx[42]
			? ", "
			: "") + "";

		let t;
		let a_copy_value_value;
		let a_href_value;

		const block = {
			c: function create() {
				a = element("a");
				t = text(t_value);
				attr_dev(a, "class", "copy svelte-kbzda9");
				attr_dev(a, "copy-value", a_copy_value_value = /*studio*/ ctx[35] || "");
				attr_dev(a, "rel", "noopener noreferrer");
				attr_dev(a, "target", "_blank");
				attr_dev(a, "href", a_href_value = /*studioUrl*/ ctx[36] || "");
				add_location(a, file$8, 550, 48, 21290);
			},
			m: function mount(target, anchor) {
				insert_dev(target, a, anchor);
				append_dev(a, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*$finalAnimeList*/ 4 && t_value !== (t_value = /*studio*/ ctx[35] + (Object.entries(/*anime*/ ctx[27]?.studios || {}).length - 1 > /*studioIdx*/ ctx[42]
					? ", "
					: "") + "")) set_data_dev(t, t_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && a_copy_value_value !== (a_copy_value_value = /*studio*/ ctx[35] || "")) {
					attr_dev(a, "copy-value", a_copy_value_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && a_href_value !== (a_href_value = /*studioUrl*/ ctx[36] || "")) {
					attr_dev(a, "href", a_href_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(a);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_6$1.name,
			type: "if",
			source: "(550:44) {#if studio}",
			ctx
		});

		return block;
	}

	// (549:40) {#each Object.entries(anime.studios || {}) as [studio, studioUrl], studioIdx (studio)}
	function create_each_block_5$1(key_1, ctx) {
		let first;
		let if_block_anchor;
		let if_block = /*studio*/ ctx[35] && create_if_block_6$1(ctx);

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

				if (/*studio*/ ctx[35]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_6$1(ctx);
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
			id: create_each_block_5$1.name,
			type: "each",
			source: "(549:40) {#each Object.entries(anime.studios || {}) as [studio, studioUrl], studioIdx (studio)}",
			ctx
		});

		return block;
	}

	// (586:36) {:else}
	function create_else_block_2$1(ctx) {
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
			id: create_else_block_2$1.name,
			type: "else",
			source: "(586:36) {:else}",
			ctx
		});

		return block;
	}

	// (576:36) {#if anime.genres.length}
	function create_if_block_4$1(ctx) {
		let each_blocks = [];
		let each_1_lookup = new Map();
		let each_1_anchor;
		let each_value_4 = /*anime*/ ctx[27].genres;
		validate_each_argument(each_value_4);
		const get_key = ctx => /*genre*/ ctx[39];
		validate_each_keys(ctx, each_value_4, get_each_context_4$1, get_key);

		for (let i = 0; i < each_value_4.length; i += 1) {
			let child_ctx = get_each_context_4$1(ctx, each_value_4, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_4$1(key, child_ctx));
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
				if (dirty[0] & /*$finalAnimeList*/ 4) {
					each_value_4 = /*anime*/ ctx[27].genres;
					validate_each_argument(each_value_4);
					validate_each_keys(ctx, each_value_4, get_each_context_4$1, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_4, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block_4$1, each_1_anchor, get_each_context_4$1);
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
			id: create_if_block_4$1.name,
			type: "if",
			source: "(576:36) {#if anime.genres.length}",
			ctx
		});

		return block;
	}

	// (577:40) {#each anime.genres as genre, idx (genre)}
	function create_each_block_4$1(key_1, ctx) {
		let span;

		let t0_value = (/*idx*/ ctx[32] < /*anime*/ ctx[27].genres.length - 1
			? /*genre*/ ctx[39] + ", "
			: /*genre*/ ctx[39]) + "";

		let t0;
		let t1;
		let span_copy_value_value;

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				span = element("span");
				t0 = text(t0_value);
				t1 = space();
				attr_dev(span, "class", "copy");
				attr_dev(span, "copy-value", span_copy_value_value = /*genre*/ ctx[39] || "");
				add_location(span, file$8, 577, 44, 22943);
				this.first = span;
			},
			m: function mount(target, anchor) {
				insert_dev(target, span, anchor);
				append_dev(span, t0);
				append_dev(span, t1);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (dirty[0] & /*$finalAnimeList*/ 4 && t0_value !== (t0_value = (/*idx*/ ctx[32] < /*anime*/ ctx[27].genres.length - 1
					? /*genre*/ ctx[39] + ", "
					: /*genre*/ ctx[39]) + "")) set_data_dev(t0, t0_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && span_copy_value_value !== (span_copy_value_value = /*genre*/ ctx[39] || "")) {
					attr_dev(span, "copy-value", span_copy_value_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(span);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_4$1.name,
			type: "each",
			source: "(577:40) {#each anime.genres as genre, idx (genre)}",
			ctx
		});

		return block;
	}

	// (637:36) {:else}
	function create_else_block_1$1(ctx) {
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
			id: create_else_block_1$1.name,
			type: "else",
			source: "(637:36) {:else}",
			ctx
		});

		return block;
	}

	// (603:36) {#if anime.favoriteContents?.length}
	function create_if_block_1$2(ctx) {
		let each_blocks = [];
		let each_1_lookup = new Map();
		let each_1_anchor;
		let each_value_2 = /*anime*/ ctx[27].favoriteContents || [];
		validate_each_argument(each_value_2);
		const get_key = ctx => /*favoriteContent*/ ctx[33];
		validate_each_keys(ctx, each_value_2, get_each_context_2$1, get_key);

		for (let i = 0; i < each_value_2.length; i += 1) {
			let child_ctx = get_each_context_2$1(ctx, each_value_2, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_2$1(key, child_ctx));
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
				if (dirty[0] & /*$finalAnimeList*/ 4) {
					each_value_2 = /*anime*/ ctx[27].favoriteContents || [];
					validate_each_argument(each_value_2);
					validate_each_keys(ctx, each_value_2, get_each_context_2$1, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_2, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block_2$1, each_1_anchor, get_each_context_2$1);
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
			id: create_if_block_1$2.name,
			type: "if",
			source: "(603:36) {#if anime.favoriteContents?.length}",
			ctx
		});

		return block;
	}

	// (622:90) 
	function create_if_block_3$1(ctx) {
		let span;

		let t0_value = /*favoriteContent*/ ctx[33] + (/*idx*/ ctx[32] < /*anime*/ ctx[27].favoriteContents.length - 1
			? ", "
			: "") + "";

		let t0;
		let t1;
		let span_copy_value_value;

		const block = {
			c: function create() {
				span = element("span");
				t0 = text(t0_value);
				t1 = space();
				attr_dev(span, "class", "copy");
				attr_dev(span, "copy-value", span_copy_value_value = /*favoriteContent*/ ctx[33] || "");
				add_location(span, file$8, 622, 48, 25820);
			},
			m: function mount(target, anchor) {
				insert_dev(target, span, anchor);
				append_dev(span, t0);
				append_dev(span, t1);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*$finalAnimeList*/ 4 && t0_value !== (t0_value = /*favoriteContent*/ ctx[33] + (/*idx*/ ctx[32] < /*anime*/ ctx[27].favoriteContents.length - 1
					? ", "
					: "") + "")) set_data_dev(t0, t0_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && span_copy_value_value !== (span_copy_value_value = /*favoriteContent*/ ctx[33] || "")) {
					attr_dev(span, "copy-value", span_copy_value_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(span);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3$1.name,
			type: "if",
			source: "(622:90) ",
			ctx
		});

		return block;
	}

	// (605:44) {#if isJsonObject(favoriteContent)}
	function create_if_block_2$1(ctx) {
		let each_blocks = [];
		let each_1_lookup = new Map();
		let each_1_anchor;
		let each_value_3 = Object.entries(/*favoriteContent*/ ctx[33]) || [];
		validate_each_argument(each_value_3);
		const get_key = ctx => /*studio*/ ctx[35];
		validate_each_keys(ctx, each_value_3, get_each_context_3$1, get_key);

		for (let i = 0; i < each_value_3.length; i += 1) {
			let child_ctx = get_each_context_3$1(ctx, each_value_3, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_3$1(key, child_ctx));
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
				if (dirty[0] & /*$finalAnimeList*/ 4) {
					each_value_3 = Object.entries(/*favoriteContent*/ ctx[33]) || [];
					validate_each_argument(each_value_3);
					validate_each_keys(ctx, each_value_3, get_each_context_3$1, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_3, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block_3$1, each_1_anchor, get_each_context_3$1);
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
			id: create_if_block_2$1.name,
			type: "if",
			source: "(605:44) {#if isJsonObject(favoriteContent)}",
			ctx
		});

		return block;
	}

	// (606:48) {#each Object.entries(favoriteContent) || [] as [studio, studioUrl] (studio)}
	function create_each_block_3$1(key_1, ctx) {
		let a;
		let t0_value = /*studio*/ ctx[35] + "";
		let t0;
		let a_copy_value_value;
		let a_href_value;

		let t1_value = (/*idx*/ ctx[32] < /*anime*/ ctx[27].favoriteContents.length - 1
			? ", "
			: "") + "";

		let t1;

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				a = element("a");
				t0 = text(t0_value);
				t1 = text(t1_value);
				attr_dev(a, "class", "copy svelte-kbzda9");
				attr_dev(a, "copy-value", a_copy_value_value = /*studio*/ ctx[35] || "");
				attr_dev(a, "rel", "noopener noreferrer");
				attr_dev(a, "target", "_blank");
				attr_dev(a, "href", a_href_value = /*studioUrl*/ ctx[36]);
				add_location(a, file$8, 606, 52, 24715);
				this.first = a;
			},
			m: function mount(target, anchor) {
				insert_dev(target, a, anchor);
				append_dev(a, t0);
				insert_dev(target, t1, anchor);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty[0] & /*$finalAnimeList*/ 4 && t0_value !== (t0_value = /*studio*/ ctx[35] + "")) set_data_dev(t0, t0_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && a_copy_value_value !== (a_copy_value_value = /*studio*/ ctx[35] || "")) {
					attr_dev(a, "copy-value", a_copy_value_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && a_href_value !== (a_href_value = /*studioUrl*/ ctx[36])) {
					attr_dev(a, "href", a_href_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t1_value !== (t1_value = (/*idx*/ ctx[32] < /*anime*/ ctx[27].favoriteContents.length - 1
					? ", "
					: "") + "")) set_data_dev(t1, t1_value);
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(a);
				if (detaching) detach_dev(t1);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_3$1.name,
			type: "each",
			source: "(606:48) {#each Object.entries(favoriteContent) || [] as [studio, studioUrl] (studio)}",
			ctx
		});

		return block;
	}

	// (604:40) {#each anime.favoriteContents || [] as favoriteContent, idx (favoriteContent)}
	function create_each_block_2$1(key_1, ctx) {
		let first;
		let show_if;
		let if_block_anchor;

		function select_block_type_3(ctx, dirty) {
			if (dirty[0] & /*$finalAnimeList*/ 4) show_if = null;
			if (show_if == null) show_if = !!isJsonObject(/*favoriteContent*/ ctx[33]);
			if (show_if) return create_if_block_2$1;
			if (typeof /*favoriteContent*/ ctx[33] === "string") return create_if_block_3$1;
		}

		let current_block_type = select_block_type_3(ctx, [-1, -1]);
		let if_block = current_block_type && current_block_type(ctx);

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

				if (current_block_type === (current_block_type = select_block_type_3(ctx, dirty)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if (if_block) if_block.d(1);
					if_block = current_block_type && current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(first);

				if (if_block) {
					if_block.d(detaching);
				}

				if (detaching) detach_dev(if_block_anchor);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2$1.name,
			type: "each",
			source: "(604:40) {#each anime.favoriteContents || [] as favoriteContent, idx (favoriteContent)}",
			ctx
		});

		return block;
	}

	// (682:36) {:else}
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
			source: "(682:36) {:else}",
			ctx
		});

		return block;
	}

	// (672:36) {#if anime.tags.length}
	function create_if_block$3(ctx) {
		let each_blocks = [];
		let each_1_lookup = new Map();
		let each_1_anchor;
		let each_value_1 = /*anime*/ ctx[27].tags;
		validate_each_argument(each_value_1);
		const get_key = ctx => /*tag*/ ctx[30];
		validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

		for (let i = 0; i < each_value_1.length; i += 1) {
			let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
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
				if (dirty[0] & /*$finalAnimeList*/ 4) {
					each_value_1 = /*anime*/ ctx[27].tags;
					validate_each_argument(each_value_1);
					validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block_1$1, each_1_anchor, get_each_context_1$1);
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
			id: create_if_block$3.name,
			type: "if",
			source: "(672:36) {#if anime.tags.length}",
			ctx
		});

		return block;
	}

	// (673:40) {#each anime.tags as tag, idx (tag)}
	function create_each_block_1$1(key_1, ctx) {
		let span;

		let t0_value = (/*idx*/ ctx[32] < /*anime*/ ctx[27].tags.length - 1
			? /*tag*/ ctx[30] + ", "
			: /*tag*/ ctx[30]) + "";

		let t0;
		let t1;
		let span_copy_value_value;

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				span = element("span");
				t0 = text(t0_value);
				t1 = space();
				attr_dev(span, "class", "copy");
				attr_dev(span, "copy-value", span_copy_value_value = /*tag*/ ctx[30] || "");
				add_location(span, file$8, 673, 44, 28657);
				this.first = span;
			},
			m: function mount(target, anchor) {
				insert_dev(target, span, anchor);
				append_dev(span, t0);
				append_dev(span, t1);
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (dirty[0] & /*$finalAnimeList*/ 4 && t0_value !== (t0_value = (/*idx*/ ctx[32] < /*anime*/ ctx[27].tags.length - 1
					? /*tag*/ ctx[30] + ", "
					: /*tag*/ ctx[30]) + "")) set_data_dev(t0, t0_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && span_copy_value_value !== (span_copy_value_value = /*tag*/ ctx[30] || "")) {
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
			source: "(673:40) {#each anime.tags as tag, idx (tag)}",
			ctx
		});

		return block;
	}

	// (474:8) {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}
	function create_each_block$1(key_1, ctx) {
		let div50;
		let div49;
		let t0;
		let div1;
		let div0;
		let img0;
		let img0_src_value;
		let t1;
		let img1;
		let img1_src_value;
		let each_value = /*each_value*/ ctx[28];
		let animeIdx = /*animeIdx*/ ctx[29];
		let t2;
		let div2;
		let h3;
		let t4;
		let label;
		let input;
		let t5;
		let span;
		let t6;
		let div48;
		let div3;
		let a;
		let t7_value = (/*anime*/ ctx[27]?.title || "N/A") + "";
		let t7;
		let a_href_value;
		let a_class_value;
		let a_copy_value_value;
		let t8;
		let div46;
		let div6;
		let div4;
		let t10;
		let div5;
		let t11_value = (/*getFormattedAnimeFormat*/ ctx[9](/*anime*/ ctx[27]) || "N/A") + "";
		let t11;
		let div5_copy_value_value;
		let t12;
		let div9;
		let div7;
		let t14;
		let div8;
		let show_if;
		let t15;
		let div12;
		let div10;
		let t17;
		let div11;
		let t18;
		let div15;
		let div13;
		let t20;
		let div14;
		let t21_value = (formatNumber(/*anime*/ ctx[27].score) || "N/A") + "";
		let t21;
		let div14_copy_value_value;
		let t22;
		let div18;
		let div16;
		let t24;
		let div17;
		let t25;
		let div21;
		let div19;
		let t27;
		let div20;
		let t28_value = (/*getContentCaution*/ ctx[8](/*anime*/ ctx[27]) || "N/A") + "";
		let t28;
		let div20_copy_value_value;
		let t29;
		let div24;
		let div22;
		let t31;
		let div23;
		let t32_value = (/*anime*/ ctx[27].userStatus || "N/A") + "";
		let t32;
		let div23_copy_value_value;
		let t33;
		let div27;
		let div25;
		let t35;
		let div26;
		let t36_value = (/*anime*/ ctx[27].status || "N/A") + "";
		let t36;
		let div26_copy_value_value;
		let t37;
		let div30;
		let div28;
		let t39;
		let div29;
		let t40;
		let div33;
		let div31;
		let t42;
		let div32;
		let t43_value = (/*anime*/ ctx[27].averageScore || "N/A") + "";
		let t43;
		let div32_copy_value_value;
		let t44;
		let div36;
		let div34;
		let t46;
		let div35;

		let t47_value = (`${/*anime*/ ctx[27]?.season || ""}${(/*anime*/ ctx[27]?.year)
			? " " + /*anime*/ ctx[27].year
			: ""}` || "N/A") + "";

		let t47;
		let div35_copy_value_value;
		let t48;
		let div39;
		let div37;
		let t50;
		let div38;
		let t51_value = (/*anime*/ ctx[27].userScore || "N/A") + "";
		let t51;
		let div38_copy_value_value;
		let t52;
		let div42;
		let div40;
		let t54;
		let div41;
		let t55_value = (/*anime*/ ctx[27].popularity || "N/A") + "";
		let t55;
		let div41_copy_value_value;
		let t56;
		let div45;
		let div43;
		let t58;
		let div44;
		let t59_value = (formatNumber(/*anime*/ ctx[27].weightedScore) || "N/A") + "";
		let t59;
		let div44_copy_value_value;
		let t60;
		let div47;
		let button0;
		let t62;
		let button1;
		let t63_value = (/*getHiddenStatus*/ ctx[5](/*anime*/ ctx[27].id) || "N/A") + "";
		let t63;
		let t64;
		let mounted;
		let dispose;
		let if_block0 = /*anime*/ ctx[27].trailerID && create_if_block_7$1(ctx);
		const assign_div1 = () => /*div1_binding_1*/ ctx[11](div1, each_value, animeIdx);
		const unassign_div1 = () => /*div1_binding_1*/ ctx[11](null, each_value, animeIdx);

		function select_block_type(ctx, dirty) {
			if (dirty[0] & /*$finalAnimeList*/ 4) show_if = null;
			if (show_if == null) show_if = !!Object.entries(/*anime*/ ctx[27]?.studios || {}).length;
			if (show_if) return create_if_block_5$1;
			return create_else_block_3$1;
		}

		let current_block_type = select_block_type(ctx, [-1, -1]);
		let if_block1 = current_block_type(ctx);

		function select_block_type_1(ctx, dirty) {
			if (/*anime*/ ctx[27].genres.length) return create_if_block_4$1;
			return create_else_block_2$1;
		}

		let current_block_type_1 = select_block_type_1(ctx);
		let if_block2 = current_block_type_1(ctx);

		function select_block_type_2(ctx, dirty) {
			if (/*anime*/ ctx[27].favoriteContents?.length) return create_if_block_1$2;
			return create_else_block_1$1;
		}

		let current_block_type_2 = select_block_type_2(ctx);
		let if_block3 = current_block_type_2(ctx);

		function select_block_type_4(ctx, dirty) {
			if (/*anime*/ ctx[27].tags.length) return create_if_block$3;
			return create_else_block$1;
		}

		let current_block_type_3 = select_block_type_4(ctx);
		let if_block4 = current_block_type_3(ctx);
		const assign_div50 = () => /*div50_binding*/ ctx[13](div50, each_value, animeIdx);
		const unassign_div50 = () => /*div50_binding*/ ctx[13](null, each_value, animeIdx);

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div50 = element("div");
				div49 = element("div");
				if (if_block0) if_block0.c();
				t0 = space();
				div1 = element("div");
				div0 = element("div");
				img0 = element("img");
				t1 = space();
				img1 = element("img");
				t2 = space();
				div2 = element("div");
				h3 = element("h3");
				h3.textContent = "Auto Play";
				t4 = space();
				label = element("label");
				input = element("input");
				t5 = space();
				span = element("span");
				t6 = space();
				div48 = element("div");
				div3 = element("div");
				a = element("a");
				t7 = text(t7_value);
				t8 = space();
				div46 = element("div");
				div6 = element("div");
				div4 = element("div");
				div4.textContent = "Format";
				t10 = space();
				div5 = element("div");
				t11 = text(t11_value);
				t12 = space();
				div9 = element("div");
				div7 = element("div");
				div7.textContent = "Studio";
				t14 = space();
				div8 = element("div");
				if_block1.c();
				t15 = space();
				div12 = element("div");
				div10 = element("div");
				div10.textContent = "Genres";
				t17 = space();
				div11 = element("div");
				if_block2.c();
				t18 = space();
				div15 = element("div");
				div13 = element("div");
				div13.textContent = "Score";
				t20 = space();
				div14 = element("div");
				t21 = text(t21_value);
				t22 = space();
				div18 = element("div");
				div16 = element("div");
				div16.textContent = "Favorite Contents";
				t24 = space();
				div17 = element("div");
				if_block3.c();
				t25 = space();
				div21 = element("div");
				div19 = element("div");
				div19.textContent = "Content Cautions";
				t27 = space();
				div20 = element("div");
				t28 = text(t28_value);
				t29 = space();
				div24 = element("div");
				div22 = element("div");
				div22.textContent = "User Status";
				t31 = space();
				div23 = element("div");
				t32 = text(t32_value);
				t33 = space();
				div27 = element("div");
				div25 = element("div");
				div25.textContent = "Status";
				t35 = space();
				div26 = element("div");
				t36 = text(t36_value);
				t37 = space();
				div30 = element("div");
				div28 = element("div");
				div28.textContent = "Tags";
				t39 = space();
				div29 = element("div");
				if_block4.c();
				t40 = space();
				div33 = element("div");
				div31 = element("div");
				div31.textContent = "Average Score";
				t42 = space();
				div32 = element("div");
				t43 = text(t43_value);
				t44 = space();
				div36 = element("div");
				div34 = element("div");
				div34.textContent = "Season Year";
				t46 = space();
				div35 = element("div");
				t47 = text(t47_value);
				t48 = space();
				div39 = element("div");
				div37 = element("div");
				div37.textContent = "User Score";
				t50 = space();
				div38 = element("div");
				t51 = text(t51_value);
				t52 = space();
				div42 = element("div");
				div40 = element("div");
				div40.textContent = "Popularity";
				t54 = space();
				div41 = element("div");
				t55 = text(t55_value);
				t56 = space();
				div45 = element("div");
				div43 = element("div");
				div43.textContent = "Wscore";
				t58 = space();
				div44 = element("div");
				t59 = text(t59_value);
				t60 = space();
				div47 = element("div");
				button0 = element("button");
				button0.textContent = "See More";
				t62 = space();
				button1 = element("button");
				t63 = text(t63_value);
				t64 = space();
				if (!src_url_equal(img0.src, img0_src_value = /*anime*/ ctx[27].bannerImageUrl)) attr_dev(img0, "src", img0_src_value);
				attr_dev(img0, "alt", "bannerImg");
				attr_dev(img0, "class", "bannerImg svelte-kbzda9");
				set_style(img0, "opacity", `0`);
				add_location(img0, file$8, 490, 28, 18183);
				if (!src_url_equal(img1.src, img1_src_value = /*anime*/ ctx[27].coverImageUrl)) attr_dev(img1, "src", img1_src_value);
				attr_dev(img1, "alt", "coverImg");
				attr_dev(img1, "class", "coverImg svelte-kbzda9");
				set_style(img1, "opacity", `0`);
				add_location(img1, file$8, 497, 28, 18542);
				attr_dev(div0, "class", "youtubeDirect");
				add_location(div0, file$8, 489, 24, 18126);
				attr_dev(div1, "class", "popup-img svelte-kbzda9");
				set_style(div1, "display", /*anime*/ ctx[27].trailerID ? "none" : "");
				add_location(div1, file$8, 484, 20, 17907);
				attr_dev(h3, "class", "svelte-kbzda9");
				add_location(h3, file$8, 507, 24, 19003);
				attr_dev(input, "type", "checkbox");
				attr_dev(input, "class", "autoplayToggle svelte-kbzda9");
				add_location(input, file$8, 509, 28, 19099);
				attr_dev(span, "class", "slider round svelte-kbzda9");
				add_location(span, file$8, 514, 28, 19330);
				attr_dev(label, "class", "switch svelte-kbzda9");
				add_location(label, file$8, 508, 24, 19047);
				attr_dev(div2, "class", "button-container svelte-kbzda9");
				add_location(div2, file$8, 506, 20, 18947);
				attr_dev(a, "rel", "noopener noreferrer");
				attr_dev(a, "target", "_blank");
				attr_dev(a, "href", a_href_value = /*anime*/ ctx[27].animeUrl || "");
				attr_dev(a, "class", a_class_value = "" + (null_to_empty(getCautionColor(/*anime*/ ctx[27]) + "-color anime-title copy") + " svelte-kbzda9"));
				attr_dev(a, "copy-value", a_copy_value_value = /*anime*/ ctx[27].title || "");
				add_location(a, file$8, 519, 28, 19558);
				attr_dev(div3, "class", "anime-title-container svelte-kbzda9");
				add_location(div3, file$8, 518, 24, 19493);
				attr_dev(div4, "class", "info-categ svelte-kbzda9");
				add_location(div4, file$8, 534, 32, 20298);
				attr_dev(div5, "class", "format-popup info copy svelte-kbzda9");
				attr_dev(div5, "copy-value", div5_copy_value_value = /*getFormattedAnimeFormat*/ ctx[9](/*anime*/ ctx[27]) || "");
				add_location(div5, file$8, 535, 32, 20368);
				attr_dev(div6, "class", "svelte-kbzda9");
				add_location(div6, file$8, 533, 28, 20259);
				attr_dev(div7, "class", "info-categ svelte-kbzda9");
				add_location(div7, file$8, 545, 32, 20866);
				attr_dev(div8, "class", "studio-popup info svelte-kbzda9");
				add_location(div8, file$8, 546, 32, 20936);
				attr_dev(div9, "class", "svelte-kbzda9");
				add_location(div9, file$8, 544, 28, 20827);
				attr_dev(div10, "class", "info-categ svelte-kbzda9");
				add_location(div10, file$8, 573, 32, 22649);
				attr_dev(div11, "class", "genres-popup info svelte-kbzda9");
				add_location(div11, file$8, 574, 32, 22719);
				attr_dev(div12, "class", "svelte-kbzda9");
				add_location(div12, file$8, 572, 28, 22610);
				attr_dev(div13, "class", "info-categ svelte-kbzda9");
				add_location(div13, file$8, 591, 32, 23675);
				attr_dev(div14, "class", "score-popup info copy svelte-kbzda9");
				attr_dev(div14, "copy-value", div14_copy_value_value = /*anime*/ ctx[27].score ?? "");
				add_location(div14, file$8, 592, 32, 23744);
				attr_dev(div15, "class", "svelte-kbzda9");
				add_location(div15, file$8, 590, 28, 23636);
				attr_dev(div16, "class", "info-categ svelte-kbzda9");
				add_location(div16, file$8, 600, 32, 24137);
				attr_dev(div17, "class", "top-similarities-popup info svelte-kbzda9");
				add_location(div17, file$8, 601, 32, 24218);
				attr_dev(div18, "class", "svelte-kbzda9");
				add_location(div18, file$8, 599, 28, 24098);
				attr_dev(div19, "class", "info-categ svelte-kbzda9");
				add_location(div19, file$8, 642, 32, 26958);
				attr_dev(div20, "class", "content-caution-popup info copy svelte-kbzda9");
				attr_dev(div20, "copy-value", div20_copy_value_value = /*getContentCaution*/ ctx[8](/*anime*/ ctx[27]) || "");
				add_location(div20, file$8, 643, 32, 27038);
				attr_dev(div21, "class", "svelte-kbzda9");
				add_location(div21, file$8, 641, 28, 26919);
				attr_dev(div22, "class", "info-categ svelte-kbzda9");
				add_location(div22, file$8, 651, 32, 27453);
				attr_dev(div23, "class", "user-status-popup info copy svelte-kbzda9");
				attr_dev(div23, "copy-value", div23_copy_value_value = /*anime*/ ctx[27].userStatus || "");
				add_location(div23, file$8, 652, 32, 27528);
				attr_dev(div24, "class", "svelte-kbzda9");
				add_location(div24, file$8, 650, 28, 27414);
				attr_dev(div25, "class", "info-categ svelte-kbzda9");
				add_location(div25, file$8, 660, 32, 27923);
				attr_dev(div26, "class", "status-popup info copy svelte-kbzda9");
				attr_dev(div26, "copy-value", div26_copy_value_value = /*anime*/ ctx[27].status || "");
				add_location(div26, file$8, 661, 32, 27993);
				attr_dev(div27, "class", "svelte-kbzda9");
				add_location(div27, file$8, 659, 28, 27884);
				attr_dev(div28, "class", "info-categ svelte-kbzda9");
				add_location(div28, file$8, 669, 32, 28375);
				attr_dev(div29, "class", "tags-popup info svelte-kbzda9");
				add_location(div29, file$8, 670, 32, 28443);
				attr_dev(div30, "class", "svelte-kbzda9");
				add_location(div30, file$8, 668, 28, 28336);
				attr_dev(div31, "class", "info-categ svelte-kbzda9");
				add_location(div31, file$8, 687, 32, 29381);
				attr_dev(div32, "class", "average-score-popup info copy svelte-kbzda9");
				attr_dev(div32, "copy-value", div32_copy_value_value = /*anime*/ ctx[27].averageScore ?? "");
				add_location(div32, file$8, 688, 32, 29458);
				attr_dev(div33, "class", "svelte-kbzda9");
				add_location(div33, file$8, 686, 28, 29342);
				attr_dev(div34, "class", "info-categ svelte-kbzda9");
				add_location(div34, file$8, 696, 32, 29859);
				attr_dev(div35, "class", "season-year-popup info copy svelte-kbzda9");

				attr_dev(div35, "copy-value", div35_copy_value_value = `${/*anime*/ ctx[27]?.season || ""}${(/*anime*/ ctx[27]?.year)
					? " " + /*anime*/ ctx[27].year
					: ""}` || "");

				add_location(div35, file$8, 697, 32, 29934);
				attr_dev(div36, "class", "svelte-kbzda9");
				add_location(div36, file$8, 695, 28, 29820);
				attr_dev(div37, "class", "info-categ svelte-kbzda9");
				add_location(div37, file$8, 709, 32, 30581);
				attr_dev(div38, "class", "user-score-popup info copy svelte-kbzda9");
				attr_dev(div38, "copy-value", div38_copy_value_value = /*anime*/ ctx[27].userScore ?? "");
				add_location(div38, file$8, 710, 32, 30655);
				attr_dev(div39, "class", "svelte-kbzda9");
				add_location(div39, file$8, 708, 28, 30542);
				attr_dev(div40, "class", "info-categ svelte-kbzda9");
				add_location(div40, file$8, 718, 32, 31047);
				attr_dev(div41, "class", "popularity-popup info copy svelte-kbzda9");
				attr_dev(div41, "copy-value", div41_copy_value_value = /*anime*/ ctx[27].popularity ?? "");
				add_location(div41, file$8, 719, 32, 31121);
				attr_dev(div42, "class", "svelte-kbzda9");
				add_location(div42, file$8, 717, 28, 31008);
				attr_dev(div43, "class", "info-categ svelte-kbzda9");
				add_location(div43, file$8, 727, 32, 31515);
				attr_dev(div44, "class", "wscore-popup info copy svelte-kbzda9");
				attr_dev(div44, "copy-value", div44_copy_value_value = /*anime*/ ctx[27].weightedScore ?? "");
				add_location(div44, file$8, 728, 32, 31585);
				attr_dev(div45, "class", "svelte-kbzda9");
				add_location(div45, file$8, 726, 28, 31476);
				attr_dev(div46, "class", "info-list svelte-kbzda9");
				set_style(div46, "max-height", /*anime*/ ctx[27].isSeenMore ? "none" : "");
				add_location(div46, file$8, 529, 24, 20072);
				attr_dev(button0, "class", "seemoreless svelte-kbzda9");
				add_location(button0, file$8, 737, 28, 32034);
				attr_dev(button1, "class", "hideshowbtn svelte-kbzda9");
				add_location(button1, file$8, 743, 28, 32358);
				attr_dev(div47, "class", "footer svelte-kbzda9");
				add_location(div47, file$8, 736, 24, 31984);
				attr_dev(div48, "class", "popup-body svelte-kbzda9");
				add_location(div48, file$8, 517, 20, 19443);
				attr_dev(div49, "class", "popup-main svelte-kbzda9");
				add_location(div49, file$8, 475, 16, 17538);
				attr_dev(div50, "class", "popup-content svelte-kbzda9");
				add_location(div50, file$8, 474, 12, 17462);
				this.first = div50;
			},
			m: function mount(target, anchor) {
				insert_dev(target, div50, anchor);
				append_dev(div50, div49);
				if (if_block0) if_block0.m(div49, null);
				append_dev(div49, t0);
				append_dev(div49, div1);
				append_dev(div1, div0);
				append_dev(div0, img0);
				append_dev(div0, t1);
				append_dev(div0, img1);
				assign_div1();
				append_dev(div49, t2);
				append_dev(div49, div2);
				append_dev(div2, h3);
				append_dev(div2, t4);
				append_dev(div2, label);
				append_dev(label, input);
				input.checked = /*$autoPlay*/ ctx[3];
				append_dev(label, t5);
				append_dev(label, span);
				append_dev(div49, t6);
				append_dev(div49, div48);
				append_dev(div48, div3);
				append_dev(div3, a);
				append_dev(a, t7);
				append_dev(div48, t8);
				append_dev(div48, div46);
				append_dev(div46, div6);
				append_dev(div6, div4);
				append_dev(div6, t10);
				append_dev(div6, div5);
				append_dev(div5, t11);
				append_dev(div46, t12);
				append_dev(div46, div9);
				append_dev(div9, div7);
				append_dev(div9, t14);
				append_dev(div9, div8);
				if_block1.m(div8, null);
				append_dev(div46, t15);
				append_dev(div46, div12);
				append_dev(div12, div10);
				append_dev(div12, t17);
				append_dev(div12, div11);
				if_block2.m(div11, null);
				append_dev(div46, t18);
				append_dev(div46, div15);
				append_dev(div15, div13);
				append_dev(div15, t20);
				append_dev(div15, div14);
				append_dev(div14, t21);
				append_dev(div46, t22);
				append_dev(div46, div18);
				append_dev(div18, div16);
				append_dev(div18, t24);
				append_dev(div18, div17);
				if_block3.m(div17, null);
				append_dev(div46, t25);
				append_dev(div46, div21);
				append_dev(div21, div19);
				append_dev(div21, t27);
				append_dev(div21, div20);
				append_dev(div20, t28);
				append_dev(div46, t29);
				append_dev(div46, div24);
				append_dev(div24, div22);
				append_dev(div24, t31);
				append_dev(div24, div23);
				append_dev(div23, t32);
				append_dev(div46, t33);
				append_dev(div46, div27);
				append_dev(div27, div25);
				append_dev(div27, t35);
				append_dev(div27, div26);
				append_dev(div26, t36);
				append_dev(div46, t37);
				append_dev(div46, div30);
				append_dev(div30, div28);
				append_dev(div30, t39);
				append_dev(div30, div29);
				if_block4.m(div29, null);
				append_dev(div46, t40);
				append_dev(div46, div33);
				append_dev(div33, div31);
				append_dev(div33, t42);
				append_dev(div33, div32);
				append_dev(div32, t43);
				append_dev(div46, t44);
				append_dev(div46, div36);
				append_dev(div36, div34);
				append_dev(div36, t46);
				append_dev(div36, div35);
				append_dev(div35, t47);
				append_dev(div46, t48);
				append_dev(div46, div39);
				append_dev(div39, div37);
				append_dev(div39, t50);
				append_dev(div39, div38);
				append_dev(div38, t51);
				append_dev(div46, t52);
				append_dev(div46, div42);
				append_dev(div42, div40);
				append_dev(div42, t54);
				append_dev(div42, div41);
				append_dev(div41, t55);
				append_dev(div46, t56);
				append_dev(div46, div45);
				append_dev(div45, div43);
				append_dev(div45, t58);
				append_dev(div45, div44);
				append_dev(div44, t59);
				append_dev(div48, t60);
				append_dev(div48, div47);
				append_dev(div47, button0);
				append_dev(div47, t62);
				append_dev(div47, button1);
				append_dev(button1, t63);
				append_dev(div50, t64);
				assign_div50();

				if (!mounted) {
					dispose = [
						listen_dev(img0, "load", load_handler, false, false, false, false),
						listen_dev(img1, "load", load_handler_1, false, false, false, false),
						listen_dev(input, "change", /*input_change_handler*/ ctx[12]),
						listen_dev(
							button0,
							"click",
							function () {
								if (is_function(/*handleSeeMore*/ ctx[7](/*anime*/ ctx[27], /*animeIdx*/ ctx[29]))) /*handleSeeMore*/ ctx[7](/*anime*/ ctx[27], /*animeIdx*/ ctx[29]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							button0,
							"keydown",
							function () {
								if (is_function(/*handleSeeMore*/ ctx[7](/*anime*/ ctx[27], /*animeIdx*/ ctx[29]))) /*handleSeeMore*/ ctx[7](/*anime*/ ctx[27], /*animeIdx*/ ctx[29]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							button1,
							"click",
							function () {
								if (is_function(/*handleHideShow*/ ctx[6](/*anime*/ ctx[27].id))) /*handleHideShow*/ ctx[6](/*anime*/ ctx[27].id).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							button1,
							"keydown",
							function () {
								if (is_function(/*handleHideShow*/ ctx[6](/*anime*/ ctx[27].id))) /*handleHideShow*/ ctx[6](/*anime*/ ctx[27].id).apply(this, arguments);
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

				if (/*anime*/ ctx[27].trailerID) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_7$1(ctx);
						if_block0.c();
						if_block0.m(div49, t0);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && !src_url_equal(img0.src, img0_src_value = /*anime*/ ctx[27].bannerImageUrl)) {
					attr_dev(img0, "src", img0_src_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && !src_url_equal(img1.src, img1_src_value = /*anime*/ ctx[27].coverImageUrl)) {
					attr_dev(img1, "src", img1_src_value);
				}

				if (each_value !== /*each_value*/ ctx[28] || animeIdx !== /*animeIdx*/ ctx[29]) {
					unassign_div1();
					each_value = /*each_value*/ ctx[28];
					animeIdx = /*animeIdx*/ ctx[29];
					assign_div1();
				}

				if (dirty[0] & /*$finalAnimeList*/ 4) {
					set_style(div1, "display", /*anime*/ ctx[27].trailerID ? "none" : "");
				}

				if (dirty[0] & /*$autoPlay*/ 8) {
					input.checked = /*$autoPlay*/ ctx[3];
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t7_value !== (t7_value = (/*anime*/ ctx[27]?.title || "N/A") + "")) set_data_dev(t7, t7_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && a_href_value !== (a_href_value = /*anime*/ ctx[27].animeUrl || "")) {
					attr_dev(a, "href", a_href_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && a_class_value !== (a_class_value = "" + (null_to_empty(getCautionColor(/*anime*/ ctx[27]) + "-color anime-title copy") + " svelte-kbzda9"))) {
					attr_dev(a, "class", a_class_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && a_copy_value_value !== (a_copy_value_value = /*anime*/ ctx[27].title || "")) {
					attr_dev(a, "copy-value", a_copy_value_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t11_value !== (t11_value = (/*getFormattedAnimeFormat*/ ctx[9](/*anime*/ ctx[27]) || "N/A") + "")) set_data_dev(t11, t11_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && div5_copy_value_value !== (div5_copy_value_value = /*getFormattedAnimeFormat*/ ctx[9](/*anime*/ ctx[27]) || "")) {
					attr_dev(div5, "copy-value", div5_copy_value_value);
				}

				if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1.d(1);
					if_block1 = current_block_type(ctx);

					if (if_block1) {
						if_block1.c();
						if_block1.m(div8, null);
					}
				}

				if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2.d(1);
					if_block2 = current_block_type_1(ctx);

					if (if_block2) {
						if_block2.c();
						if_block2.m(div11, null);
					}
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t21_value !== (t21_value = (formatNumber(/*anime*/ ctx[27].score) || "N/A") + "")) set_data_dev(t21, t21_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && div14_copy_value_value !== (div14_copy_value_value = /*anime*/ ctx[27].score ?? "")) {
					attr_dev(div14, "copy-value", div14_copy_value_value);
				}

				if (current_block_type_2 === (current_block_type_2 = select_block_type_2(ctx)) && if_block3) {
					if_block3.p(ctx, dirty);
				} else {
					if_block3.d(1);
					if_block3 = current_block_type_2(ctx);

					if (if_block3) {
						if_block3.c();
						if_block3.m(div17, null);
					}
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t28_value !== (t28_value = (/*getContentCaution*/ ctx[8](/*anime*/ ctx[27]) || "N/A") + "")) set_data_dev(t28, t28_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && div20_copy_value_value !== (div20_copy_value_value = /*getContentCaution*/ ctx[8](/*anime*/ ctx[27]) || "")) {
					attr_dev(div20, "copy-value", div20_copy_value_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t32_value !== (t32_value = (/*anime*/ ctx[27].userStatus || "N/A") + "")) set_data_dev(t32, t32_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && div23_copy_value_value !== (div23_copy_value_value = /*anime*/ ctx[27].userStatus || "")) {
					attr_dev(div23, "copy-value", div23_copy_value_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t36_value !== (t36_value = (/*anime*/ ctx[27].status || "N/A") + "")) set_data_dev(t36, t36_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && div26_copy_value_value !== (div26_copy_value_value = /*anime*/ ctx[27].status || "")) {
					attr_dev(div26, "copy-value", div26_copy_value_value);
				}

				if (current_block_type_3 === (current_block_type_3 = select_block_type_4(ctx)) && if_block4) {
					if_block4.p(ctx, dirty);
				} else {
					if_block4.d(1);
					if_block4 = current_block_type_3(ctx);

					if (if_block4) {
						if_block4.c();
						if_block4.m(div29, null);
					}
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t43_value !== (t43_value = (/*anime*/ ctx[27].averageScore || "N/A") + "")) set_data_dev(t43, t43_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && div32_copy_value_value !== (div32_copy_value_value = /*anime*/ ctx[27].averageScore ?? "")) {
					attr_dev(div32, "copy-value", div32_copy_value_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t47_value !== (t47_value = (`${/*anime*/ ctx[27]?.season || ""}${(/*anime*/ ctx[27]?.year)
					? " " + /*anime*/ ctx[27].year
					: ""}` || "N/A") + "")) set_data_dev(t47, t47_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && div35_copy_value_value !== (div35_copy_value_value = `${/*anime*/ ctx[27]?.season || ""}${(/*anime*/ ctx[27]?.year)
					? " " + /*anime*/ ctx[27].year
					: ""}` || "")) {
					attr_dev(div35, "copy-value", div35_copy_value_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t51_value !== (t51_value = (/*anime*/ ctx[27].userScore || "N/A") + "")) set_data_dev(t51, t51_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && div38_copy_value_value !== (div38_copy_value_value = /*anime*/ ctx[27].userScore ?? "")) {
					attr_dev(div38, "copy-value", div38_copy_value_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t55_value !== (t55_value = (/*anime*/ ctx[27].popularity || "N/A") + "")) set_data_dev(t55, t55_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && div41_copy_value_value !== (div41_copy_value_value = /*anime*/ ctx[27].popularity ?? "")) {
					attr_dev(div41, "copy-value", div41_copy_value_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t59_value !== (t59_value = (formatNumber(/*anime*/ ctx[27].weightedScore) || "N/A") + "")) set_data_dev(t59, t59_value);

				if (dirty[0] & /*$finalAnimeList*/ 4 && div44_copy_value_value !== (div44_copy_value_value = /*anime*/ ctx[27].weightedScore ?? "")) {
					attr_dev(div44, "copy-value", div44_copy_value_value);
				}

				if (dirty[0] & /*$finalAnimeList*/ 4) {
					set_style(div46, "max-height", /*anime*/ ctx[27].isSeenMore ? "none" : "");
				}

				if (dirty[0] & /*$finalAnimeList*/ 4 && t63_value !== (t63_value = (/*getHiddenStatus*/ ctx[5](/*anime*/ ctx[27].id) || "N/A") + "")) set_data_dev(t63, t63_value);

				if (each_value !== /*each_value*/ ctx[28] || animeIdx !== /*animeIdx*/ ctx[29]) {
					unassign_div50();
					each_value = /*each_value*/ ctx[28];
					animeIdx = /*animeIdx*/ ctx[29];
					assign_div50();
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(div50);
				if (if_block0) if_block0.d();
				unassign_div1();
				if_block1.d();
				if_block2.d();
				if_block3.d();
				if_block4.d();
				unassign_div50();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$1.name,
			type: "each",
			source: "(474:8) {#each $finalAnimeList || [] as anime, animeIdx (anime.id)}",
			ctx
		});

		return block;
	}

	function create_fragment$9(ctx) {
		let div2;
		let div0;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let t0;
		let div1;
		let mounted;
		let dispose;
		let each_value = /*$finalAnimeList*/ ctx[2] || [];
		validate_each_argument(each_value);
		const get_key = ctx => /*anime*/ ctx[27].id;
		validate_each_keys(ctx, each_value, get_each_context$1, get_key);

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$1(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
		}

		const block = {
			c: function create() {
				div2 = element("div");
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t0 = space();
				div1 = element("div");
				div1.textContent = "×";
				attr_dev(div0, "id", "popup-container");
				attr_dev(div0, "class", "popup-container hide svelte-kbzda9");
				set_style(div0, "--translateY", window.innerHeight + "px");
				add_location(div0, file$8, 467, 4, 17208);
				attr_dev(div1, "id", "closing-x");
				attr_dev(div1, "class", "closing-x svelte-kbzda9");
				add_location(div1, file$8, 755, 4, 32807);
				attr_dev(div2, "id", "popup-wrapper");
				attr_dev(div2, "class", "popup-wrapper svelte-kbzda9");
				add_location(div2, file$8, 460, 0, 17036);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

    			/*div0_binding*/ ctx[14](div0);
				append_dev(div2, t0);
				append_dev(div2, div1);
    			/*div2_binding*/ ctx[15](div2);

				if (!mounted) {
					dispose = [
						listen_dev(div1, "click", /*handlePopupVisibility*/ ctx[4], false, false, false, false),
						listen_dev(div1, "keydown", /*handlePopupVisibility*/ ctx[4], false, false, false, false),
						listen_dev(div2, "click", /*handlePopupVisibility*/ ctx[4], false, false, false, false),
						listen_dev(div2, "keydown", /*handlePopupVisibility*/ ctx[4], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*$finalAnimeList, handleHideShow, getHiddenStatus, handleSeeMore, getContentCaution, getFormattedAnimeFormat, $autoPlay*/ 1004) {
					each_value = /*$finalAnimeList*/ ctx[2] || [];
					validate_each_argument(each_value);
					validate_each_keys(ctx, each_value, get_each_context$1, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div0, destroy_block, create_each_block$1, null, get_each_context$1);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) detach_dev(div2);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

    			/*div0_binding*/ ctx[14](null);
    			/*div2_binding*/ ctx[15](null);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$9.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function getCautionColor({ contentCaution, meanScoreAll, meanScoreAbove, score }) {
		if (contentCaution?.caution?.length) {
			// Caution
			return "red";
		} else if (score < meanScoreAll) {
			// Very Low Score
			return "purple";
		} else if (score < meanScoreAbove) {
			// Low Score
			return "orange";
		} else if (contentCaution?.semiCaution?.length) {
			// Semi Caution
			return "teal";
		} else {
			return "green";
		}
	}

	const load_handler = e => e.target.style.opacity = 0.75;
	const load_handler_1 = e => e.target.style.opacity = 1;

	function instance$9($$self, $$props, $$invalidate) {
		let $ytPlayers;
		let $popupVisible;
		let $finalAnimeList;
		let $autoPlay;
		let $animeObserver;
		let $openedAnimePopupIdx;
		let $animeLoaderWorker;
		let $hiddenEntries;
		validate_store(ytPlayers, 'ytPlayers');
		component_subscribe($$self, ytPlayers, $$value => $$invalidate(18, $ytPlayers = $$value));
		validate_store(popupVisible, 'popupVisible');
		component_subscribe($$self, popupVisible, $$value => $$invalidate(19, $popupVisible = $$value));
		validate_store(finalAnimeList, 'finalAnimeList');
		component_subscribe($$self, finalAnimeList, $$value => $$invalidate(2, $finalAnimeList = $$value));
		validate_store(autoPlay, 'autoPlay');
		component_subscribe($$self, autoPlay, $$value => $$invalidate(3, $autoPlay = $$value));
		validate_store(animeObserver, 'animeObserver');
		component_subscribe($$self, animeObserver, $$value => $$invalidate(20, $animeObserver = $$value));
		validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
		component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(21, $openedAnimePopupIdx = $$value));
		validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
		component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(22, $animeLoaderWorker = $$value));
		validate_store(hiddenEntries, 'hiddenEntries');
		component_subscribe($$self, hiddenEntries, $$value => $$invalidate(23, $hiddenEntries = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('AnimePopup', slots, []);
		let popupWrapper, popupContainer;

		function handlePopupVisibility(e) {
			let target = e.target;
			let classList = target.classList;
			if (target.closest(".popup-container") || classList.contains("popup-container")) return;
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

		function handleHideShow(animeID) {
			let isHidden = $hiddenEntries[animeID];

			if (isHidden) {
				if (confirm("Are you sure you want to show the anime?")) {
					delete $hiddenEntries[animeID];
					hiddenEntries.set($hiddenEntries);

					if ($finalAnimeList.length && $animeLoaderWorker instanceof Worker) {
						$animeLoaderWorker.postMessage({ removeID: animeID });
					}
				}
			} else {
				if (confirm("Are you sure you want to hide the anime?")) {
					set_store_value(hiddenEntries, $hiddenEntries[animeID] = true, $hiddenEntries);

					if ($finalAnimeList.length && $animeLoaderWorker instanceof Worker) {
						$animeLoaderWorker.postMessage({ removeID: animeID });
					}
				}
			}
		}

		async function handleSeeMore(anime, animeIdx) {
			if ($finalAnimeList[animeIdx]) {
				set_store_value(finalAnimeList, $finalAnimeList[animeIdx].isSeenMore = !$finalAnimeList[animeIdx].isSeenMore, $finalAnimeList);
				await tick();
				let targetEl = anime.popupElement;

				if (targetEl instanceof Element && popupContainer instanceof Element) {
					scrollToElement(popupContainer, targetEl, "bottom");
				}
			}
		}

		function getContentCaution({ contentCaution, meanScoreAll, meanScoreAbove, score }) {
			let _contentCaution = (contentCaution?.caution || []).concat(contentCaution?.semiCaution || []);

			if (score < meanScoreAll) {
				// Very Low Score
				_contentCaution.push(`Very Low Score (mean: ${formatNumber(meanScoreAll)})`);
			} else if (score < meanScoreAbove) {
				// Low Score
				_contentCaution.push(`Low Score (mean: ${formatNumber(meanScoreAbove)})`);
			}

			return _contentCaution.join(", ") || "";
		}

		hiddenEntries.subscribe(async val => {
			if (isJsonObject(val)) {
				await saveJSON(val, "hiddenEntries");
			}
		});

		popupVisible.subscribe(async val => {
			if (!(popupWrapper instanceof Element) || !(popupContainer instanceof Element)) return;

			if (val === true) {
				// Init Height
				Object.assign(popupContainer.style, {
					"--translateY": window.innerHeight + "px"
				});

				// Scroll To Opened Anime
				let openedAnimePopupEl = popupContainer?.children[$openedAnimePopupIdx ?? 0];

				if (openedAnimePopupEl instanceof Element) {
					scrollToElement(popupContainer, openedAnimePopupEl);

					// Animate Opening
					popupWrapper.classList.add("visible");

					popupContainer.classList.add("show");

					// Try to Add YT player
					let openedAnime = $finalAnimeList[$openedAnimePopupIdx];

					let trailerEl = openedAnime?.popupTrailer?.querySelector(".trailer");
					let haveNoTrailer = true;

					for (let i = 0; i < $ytPlayers?.length ?? -1; i++) {
						if ($ytPlayers[i].g === trailerEl) {
							if ($autoPlay) {
								await tick();

								if (popupWrapper?.classList?.contains?.("visible")) {
									$ytPlayers[i]?.playVideo?.();
								}
							}

							haveNoTrailer = false;
							break;
						}
					}

					if (haveNoTrailer) {
						createPopupYTPlayer(openedAnime);
					}

					set_store_value(openedAnimePopupIdx, $openedAnimePopupIdx = null, $openedAnimePopupIdx);
				} else {
					// Animate Opening
					popupWrapper.classList.add("visible");

					popupContainer.classList.add("show");
				}
			} else if (val === false) {
				popupContainer.classList.remove("show");
				popupContainer.classList.add("hide");

				setTimeout(
					() => {
						// Stop All Player
						$ytPlayers?.forEach(ytPlayer => ytPlayer?.pauseVideo?.());

						popupWrapper.classList.remove("visible");
					},
					300
				);
			}
		});

		finalAnimeList.subscribe(async val => {
			if (val instanceof Array) {
				await tick();

				try {
					if ($animeObserver && val.length) {
						// Popup Observed
						$animeObserver.observe($finalAnimeList[$finalAnimeList.length - 1].popupElement);
					}

					playMostVisibleTrailer();
				} catch (ex) {

				}
			}
		});

		autoPlay.subscribe(async val => {
			if (typeof val === "boolean") {
				await saveJSON(val, "autoPlay");

				if (val === true) {
					playMostVisibleTrailer();
				} else {
					$ytPlayers?.forEach(ytPlayer => ytPlayer?.pauseVideo?.());
				}
			}
		});

		let unsubSlideEvents, scrollToGridTimeout;

		onMount(() => {
			document.getElementById("popup-container").addEventListener("scroll", () => {
				playMostVisibleTrailer();
				if (scrollToGridTimeout) clearTimeout(scrollToGridTimeout);

				scrollToGridTimeout = setTimeout(
					() => {
						// Scroll to Anime in Grid
						getMostVisibleElement(popupContainer, ".popup-trailer");
					},
					33
				);
			});

			if (window.innerWidth <= 768) {
				unsubSlideEvents = captureSlideEvent(popupContainer, () => {
					return new Promise(resolve => {
						set_store_value(popupVisible, $popupVisible = false, $popupVisible);
						setTimeout(resolve, 300); // To return values
					});
				});
			}

			window.addEventListener("resize", () => {
				if (window.innerWidth <= 768 && !unsubSlideEvents) {
					unsubSlideEvents = captureSlideEvent(popupContainer, () => {
						return new Promise(resolve => {
							set_store_value(popupVisible, $popupVisible = false, $popupVisible);
							setTimeout(resolve, 300); // To return values
						});
					});
				} else if (unsubSlideEvents && window.innerWidth > 768) {
					if (unsubSlideEvents) unsubSlideEvents();
					unsubSlideEvents = null;
				}
			});
		});

		async function playMostVisibleTrailer(once = false) {
			if (!$popupVisible) return;
			await tick();
			let visibleTrailer = getMostVisibleElement(popupContainer, ".trailer");

			if (!visibleTrailer) {
				visibleTrailer = getMostVisibleElement(popupContainer, ".popup-main", 0) || getMostVisibleElement(popupContainer, ".popup-content", 0);

				if (visibleTrailer) {
					visibleTrailer = visibleTrailer.querySelector(".trailer");
				} else {
					visibleTrailer = undefined;
				}
			}

			var haveTrailer = $ytPlayers?.some(ytPlayer => ytPlayer.g === visibleTrailer);
			let mostVisiblePopup = visibleTrailer?.closest?.(".popup-content");

			if (visibleTrailer) {
				mostVisiblePopup = visibleTrailer?.closest?.(".popup-content");
			} else {
				mostVisiblePopup = getMostVisibleElement(popupContainer, ".popup-img")?.closest?.(".popup-content");
			}

			let animeGrid = $finalAnimeList?.[getChildIndex(mostVisiblePopup) ?? -1]?.gridElement;

			if (animeGrid instanceof Element) {
				scrollToElement(window, animeGrid, "top", "smooth", -66);
			}

			// Recheck Trailer
			if (haveTrailer) {
				// Check YT Players
				$ytPlayers?.forEach(async ytPlayer => {
					if (ytPlayer.g === visibleTrailer && ytPlayer?.getPlayerState?.() !== 1 && $autoPlay) {
						await tick();

						if (popupWrapper?.classList?.contains?.("visible")) {
							ytPlayer?.playVideo?.();
						}
					} else if (ytPlayer.g !== visibleTrailer) {
						ytPlayer?.pauseVideo?.();
					}
				});
			} else {
				// Stop All Player
				$ytPlayers?.forEach(ytPlayer => ytPlayer?.pauseVideo?.());

				// Create YT Player
				let popupContent = visibleTrailer?.closest?.(".popup-content");

				let anime = $finalAnimeList?.[getChildIndex(popupContent) ?? -1];

				if (visibleTrailer) {
					if (anime && !once) createPopupYTPlayer(anime);
				}
			}
		}

		function createPopupYTPlayer(openedAnime) {
			if (!openedAnime || !(openedAnime.popupTrailer instanceof Element) || !openedAnime.trailerID || !popupWrapper?.classList?.contains("visible")) return; // Unavailable
			let ytPlayerEl = openedAnime.popupTrailer.querySelector(".trailer");
			let youtubeID = openedAnime.trailerID;

			if (ytPlayerEl instanceof Element && youtubeID) {
				if ($ytPlayers.some(ytPlayer => ytPlayer.g === ytPlayerEl)) return;

				if ($ytPlayers.length >= 8) {
					let destroyedPlayer = $ytPlayers.shift();

					// $ytPlayers = $ytPlayers
					destroyedPlayer?.destroy?.();

					let parentElement = ytPlayerEl.parentElement;
					parentElement.innerHTML = '<div class="trailer"></div>';
					ytPlayerEl = parentElement.querySelector(".trailer");
				}
			}

			// Add a Unique ID
			ytPlayerEl.setAttribute("id", "yt-player" + Date.now() + Math.random());

			let ytPlayer = new YT.Player(ytPlayerEl,
				{
					playerVars: {
						cc_lang_pref: "en", // Set preferred caption language to English
						cc_load_policy: 1, // Set on by default
						enablejsapi: 1, // Enable the JavaScript API
						loop: 1, // Enable video looping
						modestbranding: 1, // Enable modest branding (hide the YouTube logo)
						playsinline: 1, // Enable inline video playback
						playlist: youtubeID
					},
					events: {
						onReady: event => {
							onPlayerReady(event);
						}
					}
				});

			// Add Trailer to Iframe
			let trailerUrl = `https://www.youtube.com/embed/${youtubeID}?playlist=${youtubeID}&cc_load_policy=1&cc_lang_pref=en&enablejsapi=1&loop=1&modestbranding=1&playsinline=1`;

			ytPlayerEl.setAttribute("src", trailerUrl);
			$ytPlayers.push(ytPlayer);
		}

		function onPlayerReady(event) {
			let ytPlayer = event.target;
			let trailerEl = ytPlayer?.g;
			let popupTrailer = trailerEl?.parentNode;
			let popupContent = trailerEl?.closest?.(".popup-content");
			let anime = $finalAnimeList?.[getChildIndex(popupContent) ?? -1];
			let popupImg = anime?.popupImg;
			if (!anime || !popupContent || !(popupImg instanceof Element) || !(popupTrailer instanceof Element)) return;

			if (ytPlayer.getPlayerState() === -1) {
				set_store_value(ytPlayers, $ytPlayers = $ytPlayers.filter(_ytPlayer => _ytPlayer !== ytPlayer), $ytPlayers);
				ytPlayer.destroy();
				let animeBannerImg = anime?.bannerImageUrl;
				let animeBannerImgEl = popupImg.querySelector(".bannerImg");

				if (animeBannerImg && (animeBannerImgEl?.naturalHeight === 0 || animeBannerImgEl?.naturalWidth === 0)) {
					animeBannerImgEl.src = animeBannerImg;
				}

				let animeCoverImg = anime.coverImageUrl;
				let animeCoverImgEl = popupImg.querySelector(".coverImg");

				if (animeCoverImg && (animeCoverImgEl?.naturalHeight === 0 || animeCoverImgEl?.naturalWidth === 0)) {
					animeCoverImgEl.src = animeCoverImg;
				}

				popupTrailer.style.display = "none";
				popupImg.style.display = "";
				return;
			} else {
				popupTrailer.style.display = "";
				popupImg.style.display = "none";
			}

			playMostVisibleTrailer(true);
		}

		function getFormattedAnimeFormat({ episodes, format, duration }) {
			let _format = format;

			if (episodes > 0 && format) {
				_format = `${format} [${episodes}]`;

				if (duration > 0) {
					let time = msToTime(duration * 60 * 1000);
					_format = `${_format} | ${time ? time : ""}`;
				}
			}

			return _format;
		}

		// Global Function For Android
		window.returnedAppIsVisible = inApp => {
			let visibleTrailer = getMostVisibleElement(popupContainer, ".trailer");

			if (!visibleTrailer) {
				visibleTrailer = getMostVisibleElement(popupContainer, ".popup-main", 0) || getMostVisibleElement(popupContainer, ".popup-content", 0);

				if (visibleTrailer) {
					visibleTrailer = visibleTrailer.querySelector(".trailer");
				} else {
					visibleTrailer = undefined;
				}
			}

			if (!visibleTrailer) return;

			if ($popupVisible) {
				for (var ytPlayer of $ytPlayers) {
					if (ytPlayer.g === visibleTrailer) {
						if (inApp) {
							if (ytPlayer?.getPlayerState?.() === 2) {
								ytPlayer?.playVideo?.();
								break;
							}
						} else {
							ytPlayer?.pauseVideo?.();
							break;
						}
					}
				}
			}
		};

		const writable_props = [];

		Object_1.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AnimePopup> was created with unknown prop '${key}'`);
		});

		function div1_binding($$value, each_value, animeIdx) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				each_value[animeIdx].popupTrailer = $$value;
			});
		}

		function div1_binding_1($$value, each_value, animeIdx) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				each_value[animeIdx].popupImg = $$value;
			});
		}

		function input_change_handler() {
			$autoPlay = this.checked;
			autoPlay.set($autoPlay);
		}

		function div50_binding($$value, each_value, animeIdx) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				each_value[animeIdx].popupElement = $$value;
			});
		}

		function div0_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				popupContainer = $$value;
				$$invalidate(1, popupContainer);
			});
		}

		function div2_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				popupWrapper = $$value;
				$$invalidate(0, popupWrapper);
			});
		}

		$$self.$capture_state = () => ({
			onMount,
			tick,
			finalAnimeList,
			animeLoaderWorker: animeLoaderWorker$1,
			hiddenEntries,
			ytPlayers,
			autoPlay,
			animeObserver,
			popupVisible,
			openedAnimePopupIdx,
			isJsonObject,
			formatNumber,
			scrollToElement,
			getMostVisibleElement,
			getChildIndex,
			msToTime,
			scrollToElementAmount,
			saveJSON,
			captureSlideEvent,
			alter,
			popupWrapper,
			popupContainer,
			handlePopupVisibility,
			getHiddenStatus,
			handleHideShow,
			handleSeeMore,
			getContentCaution,
			getCautionColor,
			unsubSlideEvents,
			scrollToGridTimeout,
			playMostVisibleTrailer,
			createPopupYTPlayer,
			onPlayerReady,
			getFormattedAnimeFormat,
			$ytPlayers,
			$popupVisible,
			$finalAnimeList,
			$autoPlay,
			$animeObserver,
			$openedAnimePopupIdx,
			$animeLoaderWorker,
			$hiddenEntries
		});

		$$self.$inject_state = $$props => {
			if ('popupWrapper' in $$props) $$invalidate(0, popupWrapper = $$props.popupWrapper);
			if ('popupContainer' in $$props) $$invalidate(1, popupContainer = $$props.popupContainer);
			if ('unsubSlideEvents' in $$props) unsubSlideEvents = $$props.unsubSlideEvents;
			if ('scrollToGridTimeout' in $$props) scrollToGridTimeout = $$props.scrollToGridTimeout;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			popupWrapper,
			popupContainer,
			$finalAnimeList,
			$autoPlay,
			handlePopupVisibility,
			getHiddenStatus,
			handleHideShow,
			handleSeeMore,
			getContentCaution,
			getFormattedAnimeFormat,
			div1_binding,
			div1_binding_1,
			input_change_handler,
			div50_binding,
			div0_binding,
			div2_binding
		];
	}

	class AnimePopup extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$9, create_fragment$9, safe_not_equal, {}, null, [-1, -1]);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "AnimePopup",
				options,
				id: create_fragment$9.name
			});
		}
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

	/* src\components\Anime\Fixed\AnimeOptionsPopup.svelte generated by Svelte v3.59.1 */

	const file$7 = "src\\components\\Anime\\Fixed\\AnimeOptionsPopup.svelte";

	// (102:0) {#if $animeOptionVisible}
	function create_if_block$2(ctx) {
		let div1;
		let div0;
		let span0;
		let h1;
		let t0;
		let t1;
		let span1;
		let h20;
		let t3;
		let span2;
		let h21;
		let t5;
		let span3;
		let h22;
		let t7;
		let span4;
		let h23;

		let t8_value = (/*$hiddenEntries*/ ctx[3][/*animeID*/ ctx[1]]
			? "Show"
			: "Hide") + " Anime" + "";

		let t8;
		let div1_transition;
		let current;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				span0 = element("span");
				h1 = element("h1");
				t0 = text(/*animeTitle*/ ctx[0]);
				t1 = space();
				span1 = element("span");
				h20 = element("h2");
				h20.textContent = "Open Anime";
				t3 = space();
				span2 = element("span");
				h21 = element("h2");
				h21.textContent = "Open In Anilist";
				t5 = space();
				span3 = element("span");
				h22 = element("h2");
				h22.textContent = "Copy Title";
				t7 = space();
				span4 = element("span");
				h23 = element("h2");
				t8 = text(t8_value);
				attr_dev(h1, "class", "svelte-ff52zf");
				add_location(h1, file$7, 109, 38, 3396);
				attr_dev(span0, "class", "anime-title svelte-ff52zf");
				add_location(span0, file$7, 109, 12, 3370);
				attr_dev(h20, "class", "svelte-ff52zf");
				add_location(h20, file$7, 111, 17, 3516);
				attr_dev(span1, "class", "svelte-ff52zf");
				add_location(span1, file$7, 110, 12, 3438);
				attr_dev(h21, "class", "svelte-ff52zf");
				add_location(h21, file$7, 114, 17, 3646);
				attr_dev(span2, "class", "svelte-ff52zf");
				add_location(span2, file$7, 113, 12, 3570);
				attr_dev(h22, "class", "svelte-ff52zf");
				add_location(h22, file$7, 117, 17, 3773);
				attr_dev(span3, "class", "svelte-ff52zf");
				add_location(span3, file$7, 116, 12, 3705);
				attr_dev(h23, "class", "svelte-ff52zf");
				add_location(h23, file$7, 120, 17, 3905);
				attr_dev(span4, "class", "svelte-ff52zf");
				add_location(span4, file$7, 119, 12, 3827);
				attr_dev(div0, "class", "anime-options-container svelte-ff52zf");
				add_location(div0, file$7, 108, 8, 3319);
				attr_dev(div1, "class", "anime-options svelte-ff52zf");
				add_location(div1, file$7, 102, 4, 3124);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				append_dev(div0, span0);
				append_dev(span0, h1);
				append_dev(h1, t0);
				append_dev(div0, t1);
				append_dev(div0, span1);
				append_dev(span1, h20);
				append_dev(div0, t3);
				append_dev(div0, span2);
				append_dev(span2, h21);
				append_dev(div0, t5);
				append_dev(div0, span3);
				append_dev(span3, h22);
				append_dev(div0, t7);
				append_dev(div0, span4);
				append_dev(span4, h23);
				append_dev(h23, t8);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(span1, "click", /*openAnimePopup*/ ctx[5], false, false, false, false),
						listen_dev(span1, "keydown", /*openAnimePopup*/ ctx[5], false, false, false, false),
						listen_dev(span2, "click", /*openInAnilist*/ ctx[6], false, false, false, false),
						listen_dev(span2, "keydown", /*openInAnilist*/ ctx[6], false, false, false, false),
						listen_dev(span3, "click", /*copyTitle*/ ctx[7], false, false, false, false),
						listen_dev(span3, "keydown", /*copyTitle*/ ctx[7], false, false, false, false),
						listen_dev(span4, "click", /*handleHideShow*/ ctx[8], false, false, false, false),
						listen_dev(span4, "keydown", /*handleHideShow*/ ctx[8], false, false, false, false),
						listen_dev(div1, "click", /*handleAnimeOptionVisibility*/ ctx[4], false, false, false, false),
						listen_dev(div1, "keydown", /*handleAnimeOptionVisibility*/ ctx[4], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (!current || dirty & /*animeTitle*/ 1) set_data_dev(t0, /*animeTitle*/ ctx[0]);

				if ((!current || dirty & /*$hiddenEntries, animeID*/ 10) && t8_value !== (t8_value = (/*$hiddenEntries*/ ctx[3][/*animeID*/ ctx[1]]
					? "Show"
					: "Hide") + " Anime" + "")) set_data_dev(t8, t8_value);
			},
			i: function intro(local) {
				if (current) return;

				add_render_callback(() => {
					if (!current) return;
					if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 200 }, true);
					div1_transition.run(1);
				});

				current = true;
			},
			o: function outro(local) {
				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 200 }, false);
				div1_transition.run(0);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(div1);
				if (detaching && div1_transition) div1_transition.end();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$2.name,
			type: "if",
			source: "(102:0) {#if $animeOptionVisible}",
			ctx
		});

		return block;
	}

	function create_fragment$8(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*$animeOptionVisible*/ ctx[2] && create_if_block$2(ctx);

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
						if_block = create_if_block$2(ctx);
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
			id: create_fragment$8.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$8($$self, $$props, $$invalidate) {
		let $animeOptionVisible;
		let $animeLoaderWorker;
		let $finalAnimeList;
		let $hiddenEntries;
		let $popupVisible;
		let $openedAnimePopupIdx;
		let $openedAnimeOptionIdx;
		validate_store(animeOptionVisible, 'animeOptionVisible');
		component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(2, $animeOptionVisible = $$value));
		validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
		component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(12, $animeLoaderWorker = $$value));
		validate_store(finalAnimeList, 'finalAnimeList');
		component_subscribe($$self, finalAnimeList, $$value => $$invalidate(13, $finalAnimeList = $$value));
		validate_store(hiddenEntries, 'hiddenEntries');
		component_subscribe($$self, hiddenEntries, $$value => $$invalidate(3, $hiddenEntries = $$value));
		validate_store(popupVisible, 'popupVisible');
		component_subscribe($$self, popupVisible, $$value => $$invalidate(14, $popupVisible = $$value));
		validate_store(openedAnimePopupIdx, 'openedAnimePopupIdx');
		component_subscribe($$self, openedAnimePopupIdx, $$value => $$invalidate(15, $openedAnimePopupIdx = $$value));
		validate_store(openedAnimeOptionIdx, 'openedAnimeOptionIdx');
		component_subscribe($$self, openedAnimeOptionIdx, $$value => $$invalidate(16, $openedAnimeOptionIdx = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('AnimeOptionsPopup', slots, []);
		let animeTitle;
		let animeID;
		let animeUrl;
		let animeIdx;
		let isRecentlyOpened = true;

		animeOptionVisible.subscribe(val => {
			if (val === true) {
				isRecentlyOpened = true;

				setTimeout(
					() => {
						isRecentlyOpened = false;
					},
					500
				);

				let openedAnime = $finalAnimeList[$openedAnimeOptionIdx];

				if (openedAnime) {
					$$invalidate(0, animeTitle = openedAnime.title);
					$$invalidate(1, animeID = openedAnime.id);
					animeUrl = openedAnime.animeUrl;
					animeIdx = openedAnimeOptionIdx;
				}

				set_store_value(openedAnimeOptionIdx, $openedAnimeOptionIdx = null, $openedAnimeOptionIdx);
			} else {
				isRecentlyOpened = false;
			}
		});

		function handleAnimeOptionVisibility(e) {
			if (isRecentlyOpened) return;
			let target = e.target;
			let classList = target.classList;
			if (target.closest(".anime-options-container") || classList.contains("anime-options-container")) return;
			set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
		}

		function openAnimePopup() {
			if (isRecentlyOpened) return;
			set_store_value(openedAnimePopupIdx, $openedAnimePopupIdx = animeIdx, $openedAnimePopupIdx);
			set_store_value(popupVisible, $popupVisible = true, $popupVisible);
			set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
		}

		function openInAnilist() {
			if (isRecentlyOpened) return;

			if (animeUrl) {
				window.open(animeUrl, "_blank");
			}

			set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
		}

		function copyTitle() {
			if (isRecentlyOpened) return;
			window.copyToClipboard(animeTitle);
			set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
		}

		function handleHideShow() {
			if (isRecentlyOpened) return;
			let isHidden = $hiddenEntries[animeID];

			if (isHidden) {
				if (confirm("Are you sure you want to show the anime?")) {
					delete $hiddenEntries[animeID];
					hiddenEntries.set($hiddenEntries);

					if ($finalAnimeList.length && $animeLoaderWorker instanceof Worker) {
						$animeLoaderWorker.postMessage({ removeID: animeID });
					}

					set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
				}
			} else {
				if (confirm("Are you sure you want to hide the anime?")) {
					set_store_value(hiddenEntries, $hiddenEntries[animeID] = true, $hiddenEntries);

					if ($finalAnimeList.length && $animeLoaderWorker instanceof Worker) {
						$animeLoaderWorker.postMessage({ removeID: animeID });
					}

					set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
				}
			}
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AnimeOptionsPopup> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({
			fade,
			android,
			animeOptionVisible,
			openedAnimeOptionIdx,
			finalAnimeList,
			popupVisible,
			openedAnimePopupIdx,
			hiddenEntries,
			animeLoaderWorker: animeLoaderWorker$1,
			animeTitle,
			animeID,
			animeUrl,
			animeIdx,
			isRecentlyOpened,
			handleAnimeOptionVisibility,
			openAnimePopup,
			openInAnilist,
			copyTitle,
			handleHideShow,
			$animeOptionVisible,
			$animeLoaderWorker,
			$finalAnimeList,
			$hiddenEntries,
			$popupVisible,
			$openedAnimePopupIdx,
			$openedAnimeOptionIdx
		});

		$$self.$inject_state = $$props => {
			if ('animeTitle' in $$props) $$invalidate(0, animeTitle = $$props.animeTitle);
			if ('animeID' in $$props) $$invalidate(1, animeID = $$props.animeID);
			if ('animeUrl' in $$props) animeUrl = $$props.animeUrl;
			if ('animeIdx' in $$props) animeIdx = $$props.animeIdx;
			if ('isRecentlyOpened' in $$props) isRecentlyOpened = $$props.isRecentlyOpened;
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
			copyTitle,
			handleHideShow
		];
	}

	class AnimeOptionsPopup extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "AnimeOptionsPopup",
				options,
				id: create_fragment$8.name
			});
		}
	}

	/* src\components\Fixed\FilterPopup.svelte generated by Svelte v3.59.1 */

	const file$6 = "src\\components\\Fixed\\FilterPopup.svelte";

	function create_fragment$7(ctx) {
		let div6;
		let div5;
		let div0;
		let t1;
		let div2;
		let div1;
		let input0;
		let t2;
		let div3;
		let button0;
		let t4;
		let button1;
		let t6;
		let div4;
		let t7;
		let div18;
		let div17;
		let div7;
		let t9;
		let div9;
		let div8;
		let input1;
		let t10;
		let div14;
		let div13;
		let div11;
		let div10;
		let t11;
		let div12;
		let t13;
		let div15;
		let button2;
		let t15;
		let button3;
		let t17;
		let div16;

		const block = {
			c: function create() {
				div6 = element("div");
				div5 = element("div");
				div0 = element("div");
				div0.textContent = "Customize Content Caution";
				t1 = space();
				div2 = element("div");
				div1 = element("div");
				input0 = element("input");
				t2 = space();
				div3 = element("div");
				button0 = element("button");
				button0.textContent = "Later";
				t4 = space();
				button1 = element("button");
				button1.textContent = "Submit";
				t6 = space();
				div4 = element("div");
				t7 = space();
				div18 = element("div");
				div17 = element("div");
				div7 = element("div");
				div7.textContent = "Customize Recommendation Algorithm";
				t9 = space();
				div9 = element("div");
				div8 = element("div");
				input1 = element("input");
				t10 = space();
				div14 = element("div");
				div13 = element("div");
				div11 = element("div");
				div10 = element("div");
				t11 = space();
				div12 = element("div");
				div12.textContent = "Checking Username...";
				t13 = space();
				div15 = element("div");
				button2 = element("button");
				button2.textContent = "Later";
				t15 = space();
				button3 = element("button");
				button3.textContent = "Submit";
				t17 = space();
				div16 = element("div");
				attr_dev(div0, "class", "swal2-html-container-custom");
				set_style(div0, "display", "block");
				add_location(div0, file$6, 14, 8, 386);
				attr_dev(input0, "type", "text");
				attr_dev(input0, "placeholder", "Add Anime Caution (Yellow: Content, Red: !Content)");
				attr_dev(input0, "class", "flexdatalistWarnAnime");
				attr_dev(input0, "data-search-in", "info");
				input0.multiple = "multiple";
				attr_dev(input0, "data-min-length", "1");
				attr_dev(input0, "data-search-by-word", "true");
				attr_dev(input0, "data-max-shown-results", "7");
				attr_dev(input0, "name", "filter");
				add_location(input0, file$6, 19, 16, 650);
				attr_dev(div1, "class", "filter-container-custom");
				add_location(div1, file$6, 18, 12, 595);
				attr_dev(div2, "class", "swal2-html-container-custom");
				set_style(div2, "display", "block");
				add_location(div2, file$6, 17, 8, 516);
				attr_dev(button0, "id", "cancelWarnAnime");
				attr_dev(button0, "type", "button");
				attr_dev(button0, "class", "darkMode swal2-deny-custom swal2-styled-custom swal2-default-outline-custom");
				set_style(button0, "display", "inline-block");
				set_style(button0, "background-color", "rgb(226, 125, 129)");
				add_location(button0, file$6, 33, 12, 1219);
				attr_dev(button1, "id", "submitWarnAnime");
				attr_dev(button1, "type", "button");
				attr_dev(button1, "class", "darkMode swal2-confirm-custom swal2-styled-custom swal2-default-outline-custom");
				set_style(button1, "display", "inline-block");
				set_style(button1, "background-color", "rgb(0, 0, 0)");
				add_location(button1, file$6, 40, 12, 1543);
				attr_dev(div3, "class", "swal2-actions-custom");
				set_style(div3, "display", "flex");
				add_location(div3, file$6, 32, 8, 1148);
				attr_dev(div4, "class", "swal2-timer-progress-bar-container-custom");
				add_location(div4, file$6, 48, 8, 1877);
				attr_dev(div5, "id", "warnAnimeModal");
				attr_dev(div5, "class", "swal2-popup-custom swal2-modal-custom swal2-hide-custom darkMode");
				set_style(div5, "display", "grid");
				add_location(div5, file$6, 9, 4, 222);
				attr_dev(div6, "id", "warnAnimeContainer");
				attr_dev(div6, "class", "swal2-container-custom swal2-center-custom swal2-backdrop-show-custom");
				set_style(div6, "display", "none");
				set_style(div6, "overflow-y", "auto");
				set_style(div6, "display", "none");
				add_location(div6, file$6, 3, 0, 23);
				attr_dev(div7, "class", "swal2-html-container-custom");
				set_style(div7, "display", "block");
				add_location(div7, file$6, 63, 8, 2305);
				attr_dev(input1, "type", "text");
				attr_dev(input1, "placeholder", "Edit Recs (Include: Content, Exclude: !Content, WScore>=N)");
				attr_dev(input1, "class", "flexdatalistFilterAlgo");
				attr_dev(input1, "data-search-in", "info");
				input1.multiple = "multiple";
				attr_dev(input1, "data-min-length", "1");
				attr_dev(input1, "data-search-by-word", "true");
				attr_dev(input1, "data-max-shown-results", "7");
				attr_dev(input1, "name", "filter");
				add_location(input1, file$6, 68, 16, 2578);
				attr_dev(div8, "class", "filter-container-custom");
				add_location(div8, file$6, 67, 12, 2523);
				attr_dev(div9, "class", "swal2-html-container-custom");
				set_style(div9, "display", "block");
				add_location(div9, file$6, 66, 8, 2444);
				set_style(div10, "margin-right", "0.5ch");
				attr_dev(div10, "class", "dataStatusSpinner spinner darkMode");
				add_location(div10, file$6, 91, 20, 3434);
				add_location(div11, file$6, 90, 16, 3407);
				add_location(div12, file$6, 96, 16, 3625);
				attr_dev(div13, "id", "UsernameValidation");
				set_style(div13, "display", "flex");
				set_style(div13, "align-items", "center");
				set_style(div13, "justify-content", "center");
				add_location(div13, file$6, 86, 12, 3245);
				attr_dev(div14, "class", "darkMode swal2-validation-message");
				attr_dev(div14, "id", "filterAlgo-validation");
				set_style(div14, "display", "none");
				add_location(div14, file$6, 81, 8, 3085);
				attr_dev(button2, "id", "cancelFilterAlgo");
				attr_dev(button2, "type", "button");
				attr_dev(button2, "class", "darkMode swal2-deny-custom swal2-styled-custom swal2-default-outline-custom");
				set_style(button2, "display", "inline-block");
				set_style(button2, "background-color", "rgb(226, 125, 129)");
				add_location(button2, file$6, 100, 12, 3773);
				attr_dev(button3, "id", "submitFilterAlgo");
				attr_dev(button3, "type", "button");
				attr_dev(button3, "class", "darkMode swal2-confirm-custom swal2-styled-custom swal2-default-outline-custom");
				set_style(button3, "display", "inline-block");
				set_style(button3, "background-color", "rgb(0, 0, 0)");
				add_location(button3, file$6, 107, 12, 4098);
				attr_dev(div15, "class", "swal2-actions-custom");
				set_style(div15, "display", "flex");
				add_location(div15, file$6, 99, 8, 3702);
				attr_dev(div16, "class", "swal2-timer-progress-bar-container-custom");
				add_location(div16, file$6, 115, 8, 4433);
				attr_dev(div17, "id", "filterAlgoModal");
				attr_dev(div17, "class", "darkMode swal2-popup-custom swal2-modal-custom");
				set_style(div17, "display", "grid");
				add_location(div17, file$6, 58, 4, 2158);
				attr_dev(div18, "id", "filterAlgoContainer");
				attr_dev(div18, "class", "swal2-container-custom swal2-center-custom swal2-backdrop-show-custom");
				set_style(div18, "display", "none");
				set_style(div18, "overflow-y", "auto");
				set_style(div18, "display", "none");
				add_location(div18, file$6, 52, 0, 1958);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div6, anchor);
				append_dev(div6, div5);
				append_dev(div5, div0);
				append_dev(div5, t1);
				append_dev(div5, div2);
				append_dev(div2, div1);
				append_dev(div1, input0);
				append_dev(div5, t2);
				append_dev(div5, div3);
				append_dev(div3, button0);
				append_dev(div3, t4);
				append_dev(div3, button1);
				append_dev(div5, t6);
				append_dev(div5, div4);
				insert_dev(target, t7, anchor);
				insert_dev(target, div18, anchor);
				append_dev(div18, div17);
				append_dev(div17, div7);
				append_dev(div17, t9);
				append_dev(div17, div9);
				append_dev(div9, div8);
				append_dev(div8, input1);
				append_dev(div17, t10);
				append_dev(div17, div14);
				append_dev(div14, div13);
				append_dev(div13, div11);
				append_dev(div11, div10);
				append_dev(div13, t11);
				append_dev(div13, div12);
				append_dev(div17, t13);
				append_dev(div17, div15);
				append_dev(div15, button2);
				append_dev(div15, t15);
				append_dev(div15, button3);
				append_dev(div17, t17);
				append_dev(div17, div16);
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) detach_dev(div6);
				if (detaching) detach_dev(t7);
				if (detaching) detach_dev(div18);
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

	function instance$7($$self, $$props) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('FilterPopup', slots, []);
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FilterPopup> was created with unknown prop '${key}'`);
		});

		return [];
	}

	class FilterPopup extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "FilterPopup",
				options,
				id: create_fragment$7.name
			});
		}
	}

	/* src\components\Fixed\Navigator.svelte generated by Svelte v3.59.1 */
	const file$5 = "src\\components\\Fixed\\Navigator.svelte";

	function create_fragment$6(ctx) {
		let div2;
		let nav;
		let h1;
		let t1;
		let div1;
		let input;
		let input_placeholder_value;
		let t2;
		let div0;
		let i;
		let t3;
		let img;
		let img_src_value;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				div2 = element("div");
				nav = element("nav");
				h1 = element("h1");
				h1.textContent = "Kanshi.";
				t1 = space();
				div1 = element("div");
				input = element("input");
				t2 = space();
				div0 = element("div");
				i = element("i");
				t3 = space();
				img = element("img");
				attr_dev(h1, "class", "textLogo copy-value svelte-nerh2v");
				attr_dev(h1, "data-copy-value", "Kanshi.");
				add_location(h1, file$5, 127, 8, 5178);
				attr_dev(input, "id", "usernameInput");
				attr_dev(input, "type", "search");
				attr_dev(input, "enterkeyhint", "search");
				attr_dev(input, "autocomplete", "off");
				attr_dev(input, "placeholder", input_placeholder_value = "" + ((/*windowWidth*/ ctx[0] > 415 ? 'Your ' : '') + "Anilist Username"));
				attr_dev(input, "class", "svelte-nerh2v");
				add_location(input, file$5, 130, 12, 5350);
				attr_dev(i, "class", "fa-solid fa-magnifying-glass svelte-nerh2v");
				add_location(i, file$5, 144, 16, 5859);
				attr_dev(div0, "class", "searchBtn svelte-nerh2v");
				add_location(div0, file$5, 139, 12, 5699);
				attr_dev(div1, "class", "input-search svelte-nerh2v");
				add_location(div1, file$5, 129, 8, 5310);
				attr_dev(img, "class", "menu-icon svelte-nerh2v");
				if (!src_url_equal(img.src, img_src_value = "./images/Kanshi-Logo.png")) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", "menubar");
				add_location(img, file$5, 147, 8, 5947);
				attr_dev(nav, "class", "nav svelte-nerh2v");
				add_location(nav, file$5, 126, 4, 5151);
				attr_dev(div2, "class", "nav-container svelte-nerh2v");
				add_location(div2, file$5, 121, 0, 5035);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, nav);
				append_dev(nav, h1);
				append_dev(nav, t1);
				append_dev(nav, div1);
				append_dev(div1, input);
				set_input_value(input, /*typedUsername*/ ctx[1]);
				append_dev(div1, t2);
				append_dev(div1, div0);
				append_dev(div0, i);
				append_dev(nav, t3);
				append_dev(nav, img);

				if (!mounted) {
					dispose = [
						listen_dev(input, "keydown", /*updateUsername*/ ctx[2], false, false, false, false),
						listen_dev(input, "input", /*input_input_handler*/ ctx[4]),
						listen_dev(div0, "keydown", /*updateUsername*/ ctx[2], false, false, false, false),
						listen_dev(div0, "click", /*updateUsername*/ ctx[2], false, false, false, false),
						listen_dev(div2, "keydown", /*handleMenuVisibility*/ ctx[3], false, false, false, false),
						listen_dev(div2, "click", /*handleMenuVisibility*/ ctx[3], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*windowWidth*/ 1 && input_placeholder_value !== (input_placeholder_value = "" + ((/*windowWidth*/ ctx[0] > 415 ? 'Your ' : '') + "Anilist Username"))) {
					attr_dev(input, "placeholder", input_placeholder_value);
				}

				if (dirty & /*typedUsername*/ 2 && input.value !== /*typedUsername*/ ctx[1]) {
					set_input_value(input, /*typedUsername*/ ctx[1]);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) detach_dev(div2);
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

	function instance$6($$self, $$props, $$invalidate) {
		let $menuVisible;
		let $finalAnimeList;
		let $username;
		let $dataStatus;
		validate_store(menuVisible, 'menuVisible');
		component_subscribe($$self, menuVisible, $$value => $$invalidate(5, $menuVisible = $$value));
		validate_store(finalAnimeList, 'finalAnimeList');
		component_subscribe($$self, finalAnimeList, $$value => $$invalidate(6, $finalAnimeList = $$value));
		validate_store(username, 'username');
		component_subscribe($$self, username, $$value => $$invalidate(7, $username = $$value));
		validate_store(dataStatus, 'dataStatus');
		component_subscribe($$self, dataStatus, $$value => $$invalidate(8, $dataStatus = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Navigator', slots, []);
		let writableSubscriptions = [];
		let windowWidth;
		let typedUsername;

		onMount(() => {
			$$invalidate(0, windowWidth = window.innerWidth);
			window.addEventListener("resize", updateWindowHeight);

			writableSubscriptions.push(username.subscribe(val => {
				$$invalidate(1, typedUsername = val);
			}));
		});

		function updateWindowHeight() {
			$$invalidate(0, windowWidth = window.innerWidth);
		}

		function updateUsername(event) {
			let element = event.target;
			let classList = element.classList;

			if (event.key === "Enter" || event.type === "click" && (classList.contains("searchBtn") || element?.closest?.(".searchBtn"))) {
				if (typedUsername !== $username) {
					(async () => {
						if ($username) {
							if (confirm(`Currently connected to ${$username}, do you want to update?`)) {
								set_store_value(menuVisible, $menuVisible = false, $menuVisible);
								set_store_value(dataStatus, $dataStatus = "Getting User Entries", $dataStatus);

								requestUserEntries({ username: typedUsername }).then(({ message, newusername }) => {
									if (newusername) {
										$$invalidate(1, typedUsername = set_store_value(username, $username = newusername, $username));

										processRecommendedAnimeList().then(() => {
											animeLoader().then(data => {
												set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
												return;
											}).catch(error => {
												throw error;
											});
										}).catch(error => {
											throw error;
										});
									}
								}).catch(error => alert(error));
							}
						} else {
							set_store_value(menuVisible, $menuVisible = false, $menuVisible);
							set_store_value(dataStatus, $dataStatus = "Getting User Entries", $dataStatus);

							await requestUserEntries({ username: typedUsername }).then(({ message, newusername }) => {
								if (newusername) $$invalidate(1, typedUsername = set_store_value(username, $username = newusername, $username));

								processRecommendedAnimeList().then(() => {
									animeLoader().then(data => {
										set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
										return;
									}).catch(error => {
										throw error;
									});
								}).catch(error => {
									throw error;
								});
							}).catch(error => alert(error));
						}
					})();
				}
			}
		}

		function handleMenuVisibility(event) {
			let element = event.target;
			let classList = element.classList;
			if (!classList.contains("menu-icon") && !classList.contains("nav")) return;
			menuVisible.set(!$menuVisible);
		}

		onDestroy(() => {
			writableSubscriptions.forEach(unsub => unsub());
			window.removeEventListener("resize", updateWindowHeight);
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Navigator> was created with unknown prop '${key}'`);
		});

		function input_input_handler() {
			typedUsername = this.value;
			$$invalidate(1, typedUsername);
		}

		$$self.$capture_state = () => ({
			username,
			finalAnimeList,
			dataStatus,
			menuVisible,
			IDBinit,
			retrieveJSON,
			saveJSON,
			requestUserEntries,
			processRecommendedAnimeList,
			animeLoader,
			onMount,
			onDestroy,
			writableSubscriptions,
			windowWidth,
			typedUsername,
			updateWindowHeight,
			updateUsername,
			handleMenuVisibility,
			$menuVisible,
			$finalAnimeList,
			$username,
			$dataStatus
		});

		$$self.$inject_state = $$props => {
			if ('writableSubscriptions' in $$props) writableSubscriptions = $$props.writableSubscriptions;
			if ('windowWidth' in $$props) $$invalidate(0, windowWidth = $$props.windowWidth);
			if ('typedUsername' in $$props) $$invalidate(1, typedUsername = $$props.typedUsername);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			windowWidth,
			typedUsername,
			updateUsername,
			handleMenuVisibility,
			input_input_handler
		];
	}

	class Navigator extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Navigator",
				options,
				id: create_fragment$6.name
			});
		}
	}

	/* src\components\Fixed\Menu.svelte generated by Svelte v3.59.1 */

	const { console: console_1$1 } = globals;
	const file$4 = "src\\components\\Fixed\\Menu.svelte";

	// (191:0) {#if $menuVisible}
	function create_if_block$1(ctx) {
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
		let t10;
		let button5;
		let t11;
		let button5_class_value;
		let t12;
		let button6;
		let t13;
		let button6_class_value;
		let t14;
		let button7;
		let div1_transition;
		let current;
		let mounted;
		let dispose;
		let if_block = /*$android*/ ctx[4] && create_if_block_1$1(ctx);

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
				if (if_block) if_block.c();
				t8 = space();
				button4 = element("button");
				button4.textContent = "Dark Mode";
				t10 = space();
				button5 = element("button");
				t11 = text("Auto Update");
				t12 = space();
				button6 = element("button");
				t13 = text("Auto Export");
				t14 = space();
				button7 = element("button");
				button7.textContent = "Create an Anilist Account";
				attr_dev(button0, "class", "button svelte-vwrpyk");
				add_location(button0, file$4, 198, 12, 6554);
				attr_dev(button1, "class", "button svelte-vwrpyk");
				add_location(button1, file$4, 201, 12, 6689);
				attr_dev(button2, "class", "button svelte-vwrpyk");
				add_location(button2, file$4, 207, 12, 6907);
				attr_dev(button3, "class", "button svelte-vwrpyk");
				add_location(button3, file$4, 210, 12, 7042);
				attr_dev(button4, "class", "button selected svelte-vwrpyk");
				add_location(button4, file$4, 224, 12, 7569);
				attr_dev(button5, "class", button5_class_value = "" + (null_to_empty("button " + (/*$autoUpdate*/ ctx[3] ? "selected" : "")) + " svelte-vwrpyk"));
				add_location(button5, file$4, 229, 12, 7746);
				attr_dev(button6, "class", button6_class_value = "" + (null_to_empty("button " + (/*$autoExport*/ ctx[2] ? "selected" : "")) + " svelte-vwrpyk"));
				add_location(button6, file$4, 234, 12, 7973);
				attr_dev(button7, "class", "button svelte-vwrpyk");
				add_location(button7, file$4, 239, 12, 8200);
				attr_dev(div0, "class", "menu svelte-vwrpyk");
				add_location(div0, file$4, 197, 8, 6522);
				attr_dev(div1, "class", "menu-container svelte-vwrpyk");
				add_location(div1, file$4, 191, 4, 6340);
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
				if (if_block) if_block.m(div0, null);
				append_dev(div0, t8);
				append_dev(div0, button4);
				append_dev(div0, t10);
				append_dev(div0, button5);
				append_dev(button5, t11);
				append_dev(div0, t12);
				append_dev(div0, button6);
				append_dev(button6, t13);
				append_dev(div0, t14);
				append_dev(div0, button7);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", /*updateList*/ ctx[9], false, false, false, false),
						listen_dev(button0, "keydown", /*updateList*/ ctx[9], false, false, false, false),
						listen_dev(button1, "click", /*showAllHiddenEntries*/ ctx[13], false, false, false, false),
						listen_dev(button1, "keydown", /*showAllHiddenEntries*/ ctx[13], false, false, false, false),
						listen_dev(button2, "click", /*importData*/ ctx[6], false, false, false, false),
						listen_dev(button2, "keydown", /*importData*/ ctx[6], false, false, false, false),
						listen_dev(button3, "click", /*exportData*/ ctx[8], false, false, false, false),
						listen_dev(button3, "keydown", /*exportData*/ ctx[8], false, false, false, false),
						listen_dev(button4, "click", stillFixing, false, false, false, false),
						listen_dev(button4, "keydown", stillFixing, false, false, false, false),
						listen_dev(button5, "click", /*handleUpdateEveryHour*/ ctx[10], false, false, false, false),
						listen_dev(button5, "keydown", /*handleUpdateEveryHour*/ ctx[10], false, false, false, false),
						listen_dev(button6, "click", /*handleExportEveryHour*/ ctx[11], false, false, false, false),
						listen_dev(button6, "keydown", /*handleExportEveryHour*/ ctx[11], false, false, false, false),
						listen_dev(button7, "click", /*anilistSignup*/ ctx[14], false, false, false, false),
						listen_dev(button7, "keydown", /*anilistSignup*/ ctx[14], false, false, false, false),
						listen_dev(div1, "click", /*handleMenuVisibility*/ ctx[12], false, false, false, false),
						listen_dev(div1, "keydown", /*handleMenuVisibility*/ ctx[12], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (/*$android*/ ctx[4]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_1$1(ctx);
						if_block.c();
						if_block.m(div0, t8);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (!current || dirty & /*$autoUpdate*/ 8 && button5_class_value !== (button5_class_value = "" + (null_to_empty("button " + (/*$autoUpdate*/ ctx[3] ? "selected" : "")) + " svelte-vwrpyk"))) {
					attr_dev(button5, "class", button5_class_value);
				}

				if (!current || dirty & /*$autoExport*/ 4 && button6_class_value !== (button6_class_value = "" + (null_to_empty("button " + (/*$autoExport*/ ctx[2] ? "selected" : "")) + " svelte-vwrpyk"))) {
					attr_dev(button6, "class", button6_class_value);
				}
			},
			i: function intro(local) {
				if (current) return;

				add_render_callback(() => {
					if (!current) return;
					if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 300 }, true);
					div1_transition.run(1);
				});

				current = true;
			},
			o: function outro(local) {
				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 300 }, false);
				div1_transition.run(0);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(div1);
				if (if_block) if_block.d();
				if (detaching && div1_transition) div1_transition.end();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$1.name,
			type: "if",
			source: "(191:0) {#if $menuVisible}",
			ctx
		});

		return block;
	}

	// (214:12) {#if $android}
	function create_if_block_1$1(ctx) {
		let button;

		let t_value = (/*$exportPathIsAvailable*/ ctx[5]
			? "Change"
			: "Set" + " Export Folder") + "";

		let t;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button = element("button");
				t = text(t_value);
				attr_dev(button, "class", "button svelte-vwrpyk");
				add_location(button, file$4, 214, 16, 7209);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);
				append_dev(button, t);

				if (!mounted) {
					dispose = [
						listen_dev(button, "click", handleExportFolder, false, false, false, false),
						listen_dev(button, "keydown", handleExportFolder, false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*$exportPathIsAvailable*/ 32 && t_value !== (t_value = (/*$exportPathIsAvailable*/ ctx[5]
					? "Change"
					: "Set" + " Export Folder") + "")) set_data_dev(t, t_value);
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
			source: "(214:12) {#if $android}",
			ctx
		});

		return block;
	}

	function create_fragment$5(ctx) {
		let input;
		let t;
		let if_block_anchor;
		let current;
		let mounted;
		let dispose;
		let if_block = /*$menuVisible*/ ctx[1] && create_if_block$1(ctx);

		const block = {
			c: function create() {
				input = element("input");
				t = space();
				if (if_block) if_block.c();
				if_block_anchor = empty();
				attr_dev(input, "type", "file");
				attr_dev(input, "accept", ".json");
				set_style(input, "display", `none`);
				add_location(input, file$4, 183, 0, 6176);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[15](input);
				insert_dev(target, t, anchor);
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;

				if (!mounted) {
					dispose = listen_dev(input, "change", /*importJSONFile*/ ctx[7], false, false, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (/*$menuVisible*/ ctx[1]) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*$menuVisible*/ 2) {
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
				if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[15](null);
				if (detaching) detach_dev(t);
				if (if_block) if_block.d(detaching);
				if (detaching) detach_dev(if_block_anchor);
				mounted = false;
				dispose();
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

	function stillFixing() {
		alert("Still Fixing This");
	}

	// Global Function For Android
	function handleExportFolder() {
		console.log("WebtoApp: Choose an Export Path"); // Dont Remove
	}

	function instance$5($$self, $$props, $$invalidate) {
		let $menuVisible;
		let $dataStatus;
		let $finalAnimeList;
		let $searchedAnimeKeyword;
		let $animeLoaderWorker;
		let $hiddenEntries;
		let $activeTagFilters;
		let $filterOptions;
		let $autoExport;
		let $autoUpdate;
		let $android;
		let $exportPathIsAvailable;
		validate_store(menuVisible, 'menuVisible');
		component_subscribe($$self, menuVisible, $$value => $$invalidate(1, $menuVisible = $$value));
		validate_store(dataStatus, 'dataStatus');
		component_subscribe($$self, dataStatus, $$value => $$invalidate(16, $dataStatus = $$value));
		validate_store(finalAnimeList, 'finalAnimeList');
		component_subscribe($$self, finalAnimeList, $$value => $$invalidate(17, $finalAnimeList = $$value));
		validate_store(searchedAnimeKeyword, 'searchedAnimeKeyword');
		component_subscribe($$self, searchedAnimeKeyword, $$value => $$invalidate(18, $searchedAnimeKeyword = $$value));
		validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
		component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(19, $animeLoaderWorker = $$value));
		validate_store(hiddenEntries, 'hiddenEntries');
		component_subscribe($$self, hiddenEntries, $$value => $$invalidate(20, $hiddenEntries = $$value));
		validate_store(activeTagFilters, 'activeTagFilters');
		component_subscribe($$self, activeTagFilters, $$value => $$invalidate(21, $activeTagFilters = $$value));
		validate_store(filterOptions, 'filterOptions');
		component_subscribe($$self, filterOptions, $$value => $$invalidate(22, $filterOptions = $$value));
		validate_store(autoExport, 'autoExport');
		component_subscribe($$self, autoExport, $$value => $$invalidate(2, $autoExport = $$value));
		validate_store(autoUpdate, 'autoUpdate');
		component_subscribe($$self, autoUpdate, $$value => $$invalidate(3, $autoUpdate = $$value));
		validate_store(android, 'android');
		component_subscribe($$self, android, $$value => $$invalidate(4, $android = $$value));
		validate_store(exportPathIsAvailable, 'exportPathIsAvailable');
		component_subscribe($$self, exportPathIsAvailable, $$value => $$invalidate(5, $exportPathIsAvailable = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Menu', slots, []);
		let importFileInput;

		function importData() {
			if (!(importFileInput instanceof Element)) return set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);

			if (confirm("Are you sure you want to import your Data?")) {
				importFileInput.click();
			}
		}

		async function importJSONFile() {
			if (!(importFileInput instanceof Element)) return set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);
			let importedFile = importFileInput.files?.[0];

			if (importedFile) {
				let filename = importedFile.name;

				if (confirm(`File ${filename ? "named [" + filename + "] " : ""}has been detected, do you want to continue the import?`)) {
					await saveJSON(true, "shouldProcessRecommendation");
					set_store_value(menuVisible, $menuVisible = false, $menuVisible);
					importUserData({ importedFile });
				}
			}
		}

		window.setExportPathAvailability = async (value = true) => {
			set_store_value(exportPathIsAvailable, $exportPathIsAvailable = value, $exportPathIsAvailable);
			await saveJSON(value, "exportPathIsAvailable");
		};

		async function exportData() {
			if (!$exportPathIsAvailable && $android) return handleExportFolder();

			if (confirm("Are you sure you want to export your Data?")) {
				set_store_value(menuVisible, $menuVisible = false, $menuVisible);
				exportUserData();
			}
		}

		function updateList() {
			if (confirm("Are you sure you want to update your list?")) {
				set_store_value(menuVisible, $menuVisible = false, $menuVisible);
				runUpdate.update(e => !e);
			}
		}

		function handleUpdateEveryHour() {
			if (confirm(`Are you sure you want to ${$autoUpdate ? "disable" : "enable"} auto-update?`)) {
				set_store_value(menuVisible, $menuVisible = false, $menuVisible);
				set_store_value(autoUpdate, $autoUpdate = !$autoUpdate, $autoUpdate);
			}
		}

		async function handleExportEveryHour() {
			if (!$exportPathIsAvailable && $android) return handleExportFolder();

			if (confirm(`Are you sure you want to ${$autoUpdate ? "disable" : "enable"} auto-export?`)) {
				set_store_value(menuVisible, $menuVisible = false, $menuVisible);
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
				alert("No Hidden Entries");

				return;
			} else if (confirm("Are you sure you want to show all hidden Anime Entries?")) {
				if ($animeLoaderWorker) {
					$animeLoaderWorker.terminate();
					set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
				}

				set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);
				set_store_value(dataStatus, $dataStatus = "Updating List", $dataStatus);
				set_store_value(menuVisible, $menuVisible = false, $menuVisible);
				let filterSelectionIdx = $filterOptions?.filterSelection?.findIndex?.(({ filterSelectionName }) => filterSelectionName === "Anime Filter");
				let checkBoxFilterIdx = $filterOptions?.filterSelection?.[filterSelectionIdx ?? -1]?.filters?.Checkbox?.findIndex?.(({ filName }) => filName === "hidden");

				if (filterSelectionIdx >= 0 && checkBoxFilterIdx >= 0) {
					set_store_value(filterOptions, $filterOptions.filterSelection[filterSelectionIdx ?? -1].filters.Checkbox[checkBoxFilterIdx ?? -1].isSelected = false, $filterOptions);
				}

				if ($activeTagFilters?.["Anime Filter"]) {
					set_store_value(activeTagFilters, $activeTagFilters["Anime Filter"] = $activeTagFilters["Anime Filter"].filter(({ optionName, filterType }) => optionName !== "hidden" && filterType !== "checkbox"), $activeTagFilters);
				}

				set_store_value(hiddenEntries, $hiddenEntries = {}, $hiddenEntries);
				await saveJSON($filterOptions, "filterOptions");
				await saveJSON($activeTagFilters, "activeTagFilters");
				await saveJSON($hiddenEntries, "hiddenEntries");

				animeLoader().then(async data => {
					set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);
					set_store_value(searchedAnimeKeyword, $searchedAnimeKeyword = "", $searchedAnimeKeyword);
					set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
					set_store_value(dataStatus, $dataStatus = null, $dataStatus);
					return;
				}).catch(error => {
					throw error;
				});
			}
		}

		function anilistSignup() {
			if (confirm("Do you want to sign-up an Anilist account?")) {
				set_store_value(menuVisible, $menuVisible = false, $menuVisible);
				window.open("https://anilist.co/signup", "_blank");
			}
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Menu> was created with unknown prop '${key}'`);
		});

		function input_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				importFileInput = $$value;
				$$invalidate(0, importFileInput);
			});
		}

		$$self.$capture_state = () => ({
			android,
			menuVisible,
			hiddenEntries,
			animeLoaderWorker: animeLoaderWorker$1,
			finalAnimeList,
			dataStatus,
			autoUpdate,
			autoExport,
			exportPathIsAvailable,
			searchedAnimeKeyword,
			filterOptions,
			activeTagFilters,
			runUpdate,
			fade,
			saveJSON,
			animeLoader,
			exportUserData,
			importUserData,
			jsonIsEmpty,
			isAndroid,
			importFileInput,
			stillFixing,
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
			$menuVisible,
			$dataStatus,
			$finalAnimeList,
			$searchedAnimeKeyword,
			$animeLoaderWorker,
			$hiddenEntries,
			$activeTagFilters,
			$filterOptions,
			$autoExport,
			$autoUpdate,
			$android,
			$exportPathIsAvailable
		});

		$$self.$inject_state = $$props => {
			if ('importFileInput' in $$props) $$invalidate(0, importFileInput = $$props.importFileInput);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			importFileInput,
			$menuVisible,
			$autoExport,
			$autoUpdate,
			$android,
			$exportPathIsAvailable,
			importData,
			importJSONFile,
			exportData,
			updateList,
			handleUpdateEveryHour,
			handleExportEveryHour,
			handleMenuVisibility,
			showAllHiddenEntries,
			anilistSignup,
			input_binding
		];
	}

	class Menu extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Menu",
				options,
				id: create_fragment$5.name
			});
		}
	}

	/* src\components\Fixed\Toast.svelte generated by Svelte v3.59.1 */
	const file$3 = "src\\components\\Fixed\\Toast.svelte";

	function create_fragment$4(ctx) {
		let div1;
		let div0;
		let t;

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				t = text(/*$toast*/ ctx[0]);
				attr_dev(div0, "class", "toast-message svelte-1s713da");
				add_location(div0, file$3, 5, 4, 150);
				attr_dev(div1, "class", "toast-container svelte-1s713da");
				set_style(div1, "display", /*$toast*/ ctx[0] ? "" : "none");
				add_location(div1, file$3, 4, 0, 78);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				append_dev(div0, t);
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*$toast*/ 1) set_data_dev(t, /*$toast*/ ctx[0]);

				if (dirty & /*$toast*/ 1) {
					set_style(div1, "display", /*$toast*/ ctx[0] ? "" : "none");
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) detach_dev(div1);
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
		let $toast;
		validate_store(toast, 'toast');
		component_subscribe($$self, toast, $$value => $$invalidate(0, $toast = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Toast', slots, []);
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Toast> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({ toast, $toast });
		return [$toast];
	}

	class Toast extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Toast",
				options,
				id: create_fragment$4.name
			});
		}
	}

	/* src\components\Fixed\Loader.svelte generated by Svelte v3.59.1 */

	const file$2 = "src\\components\\Fixed\\Loader.svelte";

	function create_fragment$3(ctx) {
		let div1;
		let div0;
		let h1;

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				h1 = element("h1");
				h1.textContent = "Loading...";
				attr_dev(h1, "id", "loaderText");
				add_location(h1, file$2, 5, 8, 84);
				add_location(div0, file$2, 4, 4, 69);
				attr_dev(div1, "id", "loader");
				set_style(div1, "display", "none");
				add_location(div1, file$2, 3, 0, 23);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				append_dev(div0, h1);
			},
			p: noop,
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) detach_dev(div1);
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

	function instance$3($$self, $$props) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Loader', slots, []);
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Loader> was created with unknown prop '${key}'`);
		});

		return [];
	}

	class Loader extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Loader",
				options,
				id: create_fragment$3.name
			});
		}
	}

	/* src\components\Others\Header.svelte generated by Svelte v3.59.1 */

	function create_fragment$2(ctx) {
		const block = {
			c: noop,
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: noop,
			p: noop,
			i: noop,
			o: noop,
			d: noop
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

	function instance$2($$self, $$props) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Header', slots, []);
		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
		});

		return [];
	}

	class Header extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Header",
				options,
				id: create_fragment$2.name
			});
		}
	}

	/* src\components\Others\Search.svelte generated by Svelte v3.59.1 */
	const file$1 = "src\\components\\Others\\Search.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[55] = list[i].sortName;
		child_ctx[57] = i;
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[58] = list[i].optionName;
		child_ctx[59] = list[i].optionIdx;
		child_ctx[60] = list[i].selected;
		child_ctx[61] = list[i].changeType;
		child_ctx[62] = list[i].filterType;
		child_ctx[63] = list[i].categIdx;
		child_ctx[64] = list[i].optionValue;
		return child_ctx;
	}

	function get_each_context_7(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[87] = list[i];
		return child_ctx;
	}

	function get_each_context_2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[67] = list[i].filterSelectionName;
		child_ctx[68] = list[i].filters;
		child_ctx[69] = list[i].isSelected;
		child_ctx[70] = list;
		child_ctx[71] = i;
		return child_ctx;
	}

	function get_each_context_3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[72] = list[i].filName;
		child_ctx[73] = list[i].numberValue;
		child_ctx[74] = list[i].maxValue;
		child_ctx[75] = list[i].minValue;
		child_ctx[76] = list[i].defaultValue;
		child_ctx[78] = i;
		return child_ctx;
	}

	function get_each_context_4(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[79] = list[i];
		child_ctx[80] = list;
		child_ctx[81] = i;
		return child_ctx;
	}

	function get_each_context_5(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[72] = list[i].filName;
		child_ctx[82] = list[i].options;
		child_ctx[60] = list[i].selected;
		child_ctx[61] = list[i].changeType;
		child_ctx[83] = list[i].optKeyword;
		child_ctx[84] = list;
		child_ctx[85] = i;
		return child_ctx;
	}

	function get_each_context_6(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[58] = list[i].optionName;
		child_ctx[60] = list[i].selected;
		child_ctx[59] = i;
		return child_ctx;
	}

	function get_each_context_8(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[67] = list[i].filterSelectionName;
		child_ctx[69] = list[i].isSelected;
		return child_ctx;
	}

	// (905:16) {#if $filterOptions}
	function create_if_block_14(ctx) {
		let div;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let each_value_8 = /*$filterOptions*/ ctx[4]?.filterSelection || [];
		validate_each_argument(each_value_8);
		const get_key = ctx => /*filterSelectionName*/ ctx[67];
		validate_each_keys(ctx, each_value_8, get_each_context_8, get_key);

		for (let i = 0; i < each_value_8.length; i += 1) {
			let child_ctx = get_each_context_8(ctx, each_value_8, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_8(key, child_ctx));
		}

		const block = {
			c: function create() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(div, "class", "options svelte-rurued");
				add_location(div, file$1, 905, 20, 37971);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*handleFilterTypes, $filterOptions*/ 2064) {
					each_value_8 = /*$filterOptions*/ ctx[4]?.filterSelection || [];
					validate_each_argument(each_value_8);
					validate_each_keys(ctx, each_value_8, get_each_context_8, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_8, each_1_lookup, div, destroy_block, create_each_block_8, null, get_each_context_8);
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(div);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_14.name,
			type: "if",
			source: "(905:16) {#if $filterOptions}",
			ctx
		});

		return block;
	}

	// (907:24) {#each $filterOptions?.filterSelection || [] as { filterSelectionName, isSelected }
	function create_each_block_8(key_1, ctx) {
		let div;
		let h3;
		let t0_value = (/*filterSelectionName*/ ctx[67] || "") + "";
		let t0;
		let t1;
		let mounted;
		let dispose;

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div = element("div");
				h3 = element("h3");
				t0 = text(t0_value);
				t1 = space();
				attr_dev(h3, "class", "svelte-rurued");
				set_style(h3, "color", /*isSelected*/ ctx[69] ? "#3db4f2" : "inherit");
				add_location(h3, file$1, 916, 32, 38583);
				attr_dev(div, "class", "option svelte-rurued");
				add_location(div, file$1, 907, 28, 38154);
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
								if (is_function(/*handleFilterTypes*/ ctx[11](/*filterSelectionName*/ ctx[67]))) /*handleFilterTypes*/ ctx[11](/*filterSelectionName*/ ctx[67]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							div,
							"keydown",
							function () {
								if (is_function(/*handleFilterTypes*/ ctx[11](/*filterSelectionName*/ ctx[67]))) /*handleFilterTypes*/ ctx[11](/*filterSelectionName*/ ctx[67]).apply(this, arguments);
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
				if (dirty[0] & /*$filterOptions*/ 16 && t0_value !== (t0_value = (/*filterSelectionName*/ ctx[67] || "") + "")) set_data_dev(t0, t0_value);

				if (dirty[0] & /*$filterOptions*/ 16) {
					set_style(h3, "color", /*isSelected*/ ctx[69] ? "#3db4f2" : "inherit");
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
			source: "(907:24) {#each $filterOptions?.filterSelection || [] as { filterSelectionName, isSelected }",
			ctx
		});

		return block;
	}

	// (940:8) {:else}
	function create_else_block_5(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "skeleton shimmer svelte-rurued");
				add_location(div, file$1, 940, 12, 39416);
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
			id: create_else_block_5.name,
			type: "else",
			source: "(940:8) {:else}",
			ctx
		});

		return block;
	}

	// (932:8) {#if $filterOptions}
	function create_if_block_13(ctx) {
		let span;
		let h2;
		let t_value = (/*$filterOptions*/ ctx[4]?.filterSelection?.filter?.(func_1)?.[0]?.filterSelectionName || "") + "";
		let t;

		const block = {
			c: function create() {
				span = element("span");
				h2 = element("h2");
				t = text(t_value);
				attr_dev(h2, "class", "svelte-rurued");
				add_location(h2, file$1, 933, 16, 39160);
				attr_dev(span, "class", "svelte-rurued");
				add_location(span, file$1, 932, 12, 39136);
			},
			m: function mount(target, anchor) {
				insert_dev(target, span, anchor);
				append_dev(span, h2);
				append_dev(h2, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*$filterOptions*/ 16 && t_value !== (t_value = (/*$filterOptions*/ ctx[4]?.filterSelection?.filter?.(func_1)?.[0]?.filterSelectionName || "") + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(span);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_13.name,
			type: "if",
			source: "(932:8) {#if $filterOptions}",
			ctx
		});

		return block;
	}

	// (943:8) {#if $dataStatus || !$username}
	function create_if_block_10(ctx) {
		let span;
		let h2;
		let span_outro;
		let current;

		function select_block_type_1(ctx, dirty) {
			if (/*$dataStatus*/ ctx[6]) return create_if_block_11;
			if (!/*$username*/ ctx[8] && !/*$initData*/ ctx[9]) return create_if_block_12;
			return create_else_block_4;
		}

		let current_block_type = select_block_type_1(ctx);
		let if_block = current_block_type(ctx);

		const block = {
			c: function create() {
				span = element("span");
				h2 = element("h2");
				if_block.c();
				attr_dev(h2, "class", "svelte-rurued");
				add_location(h2, file$1, 944, 16, 39591);
				attr_dev(span, "class", "data-status svelte-rurued");
				add_location(span, file$1, 943, 12, 39518);
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
			id: create_if_block_10.name,
			type: "if",
			source: "(943:8) {#if $dataStatus || !$username}",
			ctx
		});

		return block;
	}

	// (950:20) {:else}
	function create_else_block_4(ctx) {
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
			id: create_else_block_4.name,
			type: "else",
			source: "(950:20) {:else}",
			ctx
		});

		return block;
	}

	// (948:55) 
	function create_if_block_12(ctx) {
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
			id: create_if_block_12.name,
			type: "if",
			source: "(948:55) ",
			ctx
		});

		return block;
	}

	// (946:20) {#if $dataStatus}
	function create_if_block_11(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text(/*$dataStatus*/ ctx[6]);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*$dataStatus*/ 64) set_data_dev(t, /*$dataStatus*/ ctx[6]);
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(t);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_11.name,
			type: "if",
			source: "(946:20) {#if $dataStatus}",
			ctx
		});

		return block;
	}

	// (1130:8) {:else}
	function create_else_block_3(ctx) {
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
			id: create_else_block_3.name,
			type: "else",
			source: "(1130:8) {:else}",
			ctx
		});

		return block;
	}

	// (962:8) {#if $filterOptions}
	function create_if_block_5(ctx) {
		let each_blocks = [];
		let each_1_lookup = new Map();
		let each_1_anchor;
		let each_value_2 = /*$filterOptions*/ ctx[4]?.filterSelection || [];
		validate_each_argument(each_value_2);
		const get_key = ctx => /*filterSelectionName*/ ctx[67] + /*filSelIdx*/ ctx[71];
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
				if (dirty[0] & /*$filterOptions, conditionalInputNumberList, handleInputNumber, handleCheckboxChange, maxFilterSelectionHeight, Init, handleFilterSelectOptionChange, filterSelect, closeFilterSelect*/ 254995) {
					each_value_2 = /*$filterOptions*/ ctx[4]?.filterSelection || [];
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
			source: "(962:8) {#if $filterOptions}",
			ctx
		});

		return block;
	}

	// (1131:12) {#each Array(10) as _}
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
				attr_dev(div0, "class", "filter-name skeleton shimmer svelte-rurued");
				add_location(div0, file$1, 1132, 20, 49168);
				attr_dev(div1, "class", "select skeleton shimmer svelte-rurued");
				add_location(div1, file$1, 1133, 20, 49234);
				attr_dev(div2, "class", "filter-select svelte-rurued");
				add_location(div2, file$1, 1131, 16, 49119);
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
			source: "(1131:12) {#each Array(10) as _}",
			ctx
		});

		return block;
	}

	// (995:28) {:else}
	function create_else_block_2(ctx) {
		let i;

		const block = {
			c: function create() {
				i = element("i");
				attr_dev(i, "class", "icon fa-solid fa-angle-down svelte-rurued");
				add_location(i, file$1, 995, 32, 42046);
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
			id: create_else_block_2.name,
			type: "else",
			source: "(995:28) {:else}",
			ctx
		});

		return block;
	}

	// (989:28) {#if selected && options.length && !Init}
	function create_if_block_9(ctx) {
		let i;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				i = element("i");
				attr_dev(i, "class", "icon fa-solid fa-angle-up svelte-rurued");
				add_location(i, file$1, 989, 32, 41706);
			},
			m: function mount(target, anchor) {
				insert_dev(target, i, anchor);

				if (!mounted) {
					dispose = [
						listen_dev(
							i,
							"keydown",
							function () {
								if (is_function(/*closeFilterSelect*/ ctx[14](/*dropdownIdx*/ ctx[85]))) /*closeFilterSelect*/ ctx[14](/*dropdownIdx*/ ctx[85]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							i,
							"click",
							function () {
								if (is_function(/*closeFilterSelect*/ ctx[14](/*dropdownIdx*/ ctx[85]))) /*closeFilterSelect*/ ctx[14](/*dropdownIdx*/ ctx[85]).apply(this, arguments);
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
			id: create_if_block_9.name,
			type: "if",
			source: "(989:28) {#if selected && options.length && !Init}",
			ctx
		});

		return block;
	}

	// (1015:36) {#if hasPartialMatch(optionName, optKeyword) || optKeyword === ""}
	function create_if_block_6(ctx) {
		let div;
		let h3;
		let t0_value = (/*optionName*/ ctx[58] || "") + "";
		let t0;
		let t1;
		let mounted;
		let dispose;

		function select_block_type_4(ctx, dirty) {
			if (/*selected*/ ctx[60] === "included") return create_if_block_7;
			if (/*selected*/ ctx[60] === "excluded") return create_if_block_8;
		}

		let current_block_type = select_block_type_4(ctx);
		let if_block = current_block_type && current_block_type(ctx);

		const block = {
			c: function create() {
				div = element("div");
				h3 = element("h3");
				t0 = text(t0_value);
				t1 = space();
				if (if_block) if_block.c();
				attr_dev(h3, "class", "svelte-rurued");
				add_location(h3, file$1, 1034, 44, 44281);
				attr_dev(div, "class", "option svelte-rurued");
				add_location(div, file$1, 1015, 40, 43114);
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
								if (is_function(/*handleFilterSelectOptionChange*/ ctx[15](/*optionName*/ ctx[58], /*filName*/ ctx[72], /*optionIdx*/ ctx[59], /*dropdownIdx*/ ctx[85], /*changeType*/ ctx[61], /*filterSelectionName*/ ctx[67]))) /*handleFilterSelectOptionChange*/ ctx[15](/*optionName*/ ctx[58], /*filName*/ ctx[72], /*optionIdx*/ ctx[59], /*dropdownIdx*/ ctx[85], /*changeType*/ ctx[61], /*filterSelectionName*/ ctx[67]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							div,
							"keydown",
							function () {
								if (is_function(/*handleFilterSelectOptionChange*/ ctx[15](/*optionName*/ ctx[58], /*filName*/ ctx[72], /*optionIdx*/ ctx[59], /*dropdownIdx*/ ctx[85], /*changeType*/ ctx[61], /*filterSelectionName*/ ctx[67]))) /*handleFilterSelectOptionChange*/ ctx[15](/*optionName*/ ctx[58], /*filName*/ ctx[72], /*optionIdx*/ ctx[59], /*dropdownIdx*/ ctx[85], /*changeType*/ ctx[61], /*filterSelectionName*/ ctx[67]).apply(this, arguments);
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
				if (dirty[0] & /*$filterOptions*/ 16 && t0_value !== (t0_value = (/*optionName*/ ctx[58] || "") + "")) set_data_dev(t0, t0_value);

				if (current_block_type !== (current_block_type = select_block_type_4(ctx))) {
					if (if_block) if_block.d(1);
					if_block = current_block_type && current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div, null);
					}
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
			id: create_if_block_6.name,
			type: "if",
			source: "(1015:36) {#if hasPartialMatch(optionName, optKeyword) || optKeyword === \\\"\\\"}",
			ctx
		});

		return block;
	}

	// (1041:78) 
	function create_if_block_8(ctx) {
		let i;

		const block = {
			c: function create() {
				i = element("i");
				attr_dev(i, "class", "fa-regular fa-circle-xmark svelte-rurued");
				set_style(i, "--optionColor", `#e85d75`);
				add_location(i, file$1, 1041, 48, 44788);
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
			id: create_if_block_8.name,
			type: "if",
			source: "(1041:78) ",
			ctx
		});

		return block;
	}

	// (1036:44) {#if selected === "included"}
	function create_if_block_7(ctx) {
		let i;

		const block = {
			c: function create() {
				i = element("i");
				attr_dev(i, "class", "fa-regular fa-circle-check svelte-rurued");
				set_style(i, "--optionColor", `#5f9ea0`);
				add_location(i, file$1, 1036, 48, 44433);
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
			id: create_if_block_7.name,
			type: "if",
			source: "(1036:44) {#if selected === \\\"included\\\"}",
			ctx
		});

		return block;
	}

	// (1014:32) {#each options as { optionName, selected }
	function create_each_block_6(key_1, ctx) {
		let first;
		let show_if = hasPartialMatch(/*optionName*/ ctx[58], /*optKeyword*/ ctx[83]) || /*optKeyword*/ ctx[83] === "";
		let if_block_anchor;
		let if_block = show_if && create_if_block_6(ctx);

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
				if (dirty[0] & /*$filterOptions*/ 16) show_if = hasPartialMatch(/*optionName*/ ctx[58], /*optKeyword*/ ctx[83]) || /*optKeyword*/ ctx[83] === "";

				if (show_if) {
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
			id: create_each_block_6.name,
			type: "each",
			source: "(1014:32) {#each options as { optionName, selected }",
			ctx
		});

		return block;
	}

	// (964:16) {#each filters.Dropdown || [] as { filName, options, selected, changeType, optKeyword }
	function create_each_block_5(key_1, ctx) {
		let div5;
		let div0;
		let h2;
		let t0_value = (/*filName*/ ctx[72] || "") + "";
		let t0;
		let t1;
		let div2;
		let div1;
		let input;
		let t2;
		let t3;
		let div4;
		let div3;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[1]}px`;
		let mounted;
		let dispose;

		function input_input_handler_1() {
    		/*input_input_handler_1*/ ctx[25].call(input, /*filSelIdx*/ ctx[71], /*dropdownIdx*/ ctx[85]);
		}

		function select_block_type_3(ctx, dirty) {
			if (/*selected*/ ctx[60] && /*options*/ ctx[82].length && !/*Init*/ ctx[0]) return create_if_block_9;
			return create_else_block_2;
		}

		let current_block_type = select_block_type_3(ctx);
		let if_block = current_block_type(ctx);

		function keydown_handler(...args) {
			return /*keydown_handler*/ ctx[26](/*dropdownIdx*/ ctx[85], ...args);
		}

		function click_handler(...args) {
			return /*click_handler*/ ctx[27](/*dropdownIdx*/ ctx[85], ...args);
		}

		let each_value_6 = /*options*/ ctx[82];
		validate_each_argument(each_value_6);
		const get_key = ctx => /*optionName*/ ctx[58] + /*optionIdx*/ ctx[59];
		validate_each_keys(ctx, each_value_6, get_each_context_6, get_key);

		for (let i = 0; i < each_value_6.length; i += 1) {
			let child_ctx = get_each_context_6(ctx, each_value_6, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_6(key, child_ctx));
		}

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div5 = element("div");
				div0 = element("div");
				h2 = element("h2");
				t0 = text(t0_value);
				t1 = space();
				div2 = element("div");
				div1 = element("div");
				input = element("input");
				t2 = space();
				if_block.c();
				t3 = space();
				div4 = element("div");
				div3 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(h2, "class", "svelte-rurued");
				add_location(h2, file$1, 969, 28, 40633);
				attr_dev(div0, "class", "filter-name svelte-rurued");
				add_location(div0, file$1, 968, 24, 40578);
				attr_dev(input, "placeholder", "Any");
				attr_dev(input, "type", "search");
				attr_dev(input, "enterkeyhint", "search");
				attr_dev(input, "autocomplete", "off");
				attr_dev(input, "class", "value-input svelte-rurued");
				add_location(input, file$1, 977, 32, 41032);
				attr_dev(div1, "class", "value-wrap svelte-rurued");
				add_location(div1, file$1, 976, 28, 40974);
				attr_dev(div2, "class", "select svelte-rurued");
				add_location(div2, file$1, 971, 24, 40715);
				attr_dev(div3, "class", "options svelte-rurued");
				add_location(div3, file$1, 1012, 28, 42834);
				attr_dev(div4, "class", "options-wrap svelte-rurued");
				set_style(div4, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);

				set_style(div4, "visibility", /*options*/ ctx[82].length && /*selected*/ ctx[60] && !/*Init*/ ctx[0]
					? ""
					: "hidden");

				set_style(div4, "pointer-events", /*options*/ ctx[82].length && /*selected*/ ctx[60] && !/*Init*/ ctx[0]
					? ""
					: "none");

				add_location(div4, file$1, 998, 24, 42180);
				attr_dev(div5, "class", "filter-select svelte-rurued");
				set_style(div5, "display", /*isSelected*/ ctx[69] ? "" : "none");
				add_location(div5, file$1, 964, 20, 40412);
				this.first = div5;
			},
			m: function mount(target, anchor) {
				insert_dev(target, div5, anchor);
				append_dev(div5, div0);
				append_dev(div0, h2);
				append_dev(h2, t0);
				append_dev(div5, t1);
				append_dev(div5, div2);
				append_dev(div2, div1);
				append_dev(div1, input);
				set_input_value(input, /*$filterOptions*/ ctx[4].filterSelection[/*filSelIdx*/ ctx[71]].filters.Dropdown[/*dropdownIdx*/ ctx[85]].optKeyword);
				append_dev(div2, t2);
				if_block.m(div2, null);
				append_dev(div5, t3);
				append_dev(div5, div4);
				append_dev(div4, div3);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div3, null);
					}
				}

				if (!mounted) {
					dispose = [
						listen_dev(input, "input", input_input_handler_1),
						listen_dev(div2, "keydown", keydown_handler, false, false, false, false),
						listen_dev(div2, "click", click_handler, false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty[0] & /*$filterOptions*/ 16 && t0_value !== (t0_value = (/*filName*/ ctx[72] || "") + "")) set_data_dev(t0, t0_value);

				if (dirty[0] & /*$filterOptions*/ 16 && input.value !== /*$filterOptions*/ ctx[4].filterSelection[/*filSelIdx*/ ctx[71]].filters.Dropdown[/*dropdownIdx*/ ctx[85]].optKeyword) {
					set_input_value(input, /*$filterOptions*/ ctx[4].filterSelection[/*filSelIdx*/ ctx[71]].filters.Dropdown[/*dropdownIdx*/ ctx[85]].optKeyword);
				}

				if (current_block_type === (current_block_type = select_block_type_3(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div2, null);
					}
				}

				if (dirty[0] & /*handleFilterSelectOptionChange, $filterOptions*/ 32784) {
					each_value_6 = /*options*/ ctx[82];
					validate_each_argument(each_value_6);
					validate_each_keys(ctx, each_value_6, get_each_context_6, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_6, each_1_lookup, div3, destroy_block, create_each_block_6, null, get_each_context_6);
				}

				if (dirty[0] & /*maxFilterSelectionHeight*/ 2 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[1]}px`)) {
					set_style(div4, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
				}

				if (dirty[0] & /*$filterOptions, Init*/ 17) {
					set_style(div4, "visibility", /*options*/ ctx[82].length && /*selected*/ ctx[60] && !/*Init*/ ctx[0]
						? ""
						: "hidden");
				}

				if (dirty[0] & /*$filterOptions, Init*/ 17) {
					set_style(div4, "pointer-events", /*options*/ ctx[82].length && /*selected*/ ctx[60] && !/*Init*/ ctx[0]
						? ""
						: "none");
				}

				if (dirty[0] & /*$filterOptions*/ 16) {
					set_style(div5, "display", /*isSelected*/ ctx[69] ? "" : "none");
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(div5);
				if_block.d();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_5.name,
			type: "each",
			source: "(964:16) {#each filters.Dropdown || [] as { filName, options, selected, changeType, optKeyword }",
			ctx
		});

		return block;
	}

	// (1054:16) {#each filters.Checkbox || [] as Checkbox, checkboxIdx (Checkbox.filName + checkboxIdx)}
	function create_each_block_4(key_1, ctx) {
		let div3;
		let div0;
		let t0;
		let div2;
		let input;
		let t1;
		let div1;
		let t2_value = (/*Checkbox*/ ctx[79].filName || "") + "";
		let t2;
		let mounted;
		let dispose;

		function change_handler(...args) {
			return /*change_handler*/ ctx[28](/*Checkbox*/ ctx[79], /*checkboxIdx*/ ctx[81], /*filterSelectionName*/ ctx[67], ...args);
		}

		function input_change_handler() {
    		/*input_change_handler*/ ctx[29].call(input, /*each_value_4*/ ctx[80], /*checkboxIdx*/ ctx[81]);
		}

		function click_handler_1(...args) {
			return /*click_handler_1*/ ctx[30](/*Checkbox*/ ctx[79], /*checkboxIdx*/ ctx[81], /*filterSelectionName*/ ctx[67], ...args);
		}

		function keydown_handler_1(...args) {
			return /*keydown_handler_1*/ ctx[31](/*Checkbox*/ ctx[79], /*checkboxIdx*/ ctx[81], /*filterSelectionName*/ ctx[67], ...args);
		}

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div3 = element("div");
				div0 = element("div");
				t0 = space();
				div2 = element("div");
				input = element("input");
				t1 = space();
				div1 = element("div");
				t2 = text(t2_value);
				attr_dev(div0, "class", "svelte-rurued");
				set_style(div0, "visibility", `none`);
				add_location(div0, file$1, 1058, 24, 45613);
				attr_dev(input, "type", "checkbox");
				attr_dev(input, "class", "checkbox svelte-rurued");
				add_location(input, file$1, 1076, 28, 46462);
				attr_dev(div1, "class", "checkbox-label svelte-rurued");
				add_location(div1, file$1, 1088, 28, 47065);
				attr_dev(div2, "class", "checkbox-wrap svelte-rurued");
				add_location(div2, file$1, 1059, 24, 45670);
				attr_dev(div3, "class", "filter-checkbox svelte-rurued");
				set_style(div3, "display", /*isSelected*/ ctx[69] ? "" : "none");
				add_location(div3, file$1, 1054, 20, 45445);
				this.first = div3;
			},
			m: function mount(target, anchor) {
				insert_dev(target, div3, anchor);
				append_dev(div3, div0);
				append_dev(div3, t0);
				append_dev(div3, div2);
				append_dev(div2, input);
				input.checked = /*Checkbox*/ ctx[79].isSelected;
				append_dev(div2, t1);
				append_dev(div2, div1);
				append_dev(div1, t2);

				if (!mounted) {
					dispose = [
						listen_dev(input, "change", change_handler, false, false, false, false),
						listen_dev(input, "change", input_change_handler),
						listen_dev(div2, "click", click_handler_1, false, false, false, false),
						listen_dev(div2, "keydown", keydown_handler_1, false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (dirty[0] & /*$filterOptions*/ 16) {
					input.checked = /*Checkbox*/ ctx[79].isSelected;
				}

				if (dirty[0] & /*$filterOptions*/ 16 && t2_value !== (t2_value = (/*Checkbox*/ ctx[79].filName || "") + "")) set_data_dev(t2, t2_value);

				if (dirty[0] & /*$filterOptions*/ 16) {
					set_style(div3, "display", /*isSelected*/ ctx[69] ? "" : "none");
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(div3);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_4.name,
			type: "each",
			source: "(1054:16) {#each filters.Checkbox || [] as Checkbox, checkboxIdx (Checkbox.filName + checkboxIdx)}",
			ctx
		});

		return block;
	}

	// (1095:16) {#each filters["Input Number"] || [] as { filName, numberValue, maxValue, minValue, defaultValue }
	function create_each_block_3(key_1, ctx) {
		let div2;
		let div0;
		let h2;
		let t0_value = (/*filName*/ ctx[72] || "") + "";
		let t0;
		let t1;
		let div1;
		let input;
		let input_placeholder_value;
		let input_value_value;
		let t2;
		let mounted;
		let dispose;

		function input_handler(...args) {
			return /*input_handler*/ ctx[32](/*inputNumIdx*/ ctx[78], /*filName*/ ctx[72], /*maxValue*/ ctx[74], /*minValue*/ ctx[75], /*filterSelectionName*/ ctx[67], ...args);
		}

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div2 = element("div");
				div0 = element("div");
				h2 = element("h2");
				t0 = text(t0_value);
				t1 = space();
				div1 = element("div");
				input = element("input");
				t2 = space();
				attr_dev(h2, "class", "svelte-rurued");
				add_location(h2, file$1, 1100, 28, 47688);
				attr_dev(div0, "class", "filter-input-number-name svelte-rurued");
				add_location(div0, file$1, 1099, 24, 47620);
				attr_dev(input, "class", "value-input-number svelte-rurued");
				attr_dev(input, "type", "text");

				attr_dev(input, "placeholder", input_placeholder_value = /*conditionalInputNumberList*/ ctx[10].includes(/*filName*/ ctx[72])
					? ">123 or 123"
					: /*defaultValue*/ ctx[76] !== null
						? "Default: " + /*defaultValue*/ ctx[76]
						: "123");

				input.value = input_value_value = /*numberValue*/ ctx[73] || "";
				add_location(input, file$1, 1103, 28, 47837);
				attr_dev(div1, "class", "value-input-number-wrap svelte-rurued");
				add_location(div1, file$1, 1102, 24, 47770);
				attr_dev(div2, "class", "filter-input-number svelte-rurued");
				set_style(div2, "display", /*isSelected*/ ctx[69] ? "" : "none");
				add_location(div2, file$1, 1095, 20, 47448);
				this.first = div2;
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
				if (dirty[0] & /*$filterOptions*/ 16 && t0_value !== (t0_value = (/*filName*/ ctx[72] || "") + "")) set_data_dev(t0, t0_value);

				if (dirty[0] & /*$filterOptions*/ 16 && input_placeholder_value !== (input_placeholder_value = /*conditionalInputNumberList*/ ctx[10].includes(/*filName*/ ctx[72])
					? ">123 or 123"
					: /*defaultValue*/ ctx[76] !== null
						? "Default: " + /*defaultValue*/ ctx[76]
						: "123")) {
					attr_dev(input, "placeholder", input_placeholder_value);
				}

				if (dirty[0] & /*$filterOptions*/ 16 && input_value_value !== (input_value_value = /*numberValue*/ ctx[73] || "") && input.value !== input_value_value) {
					prop_dev(input, "value", input_value_value);
				}

				if (dirty[0] & /*$filterOptions*/ 16) {
					set_style(div2, "display", /*isSelected*/ ctx[69] ? "" : "none");
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
			id: create_each_block_3.name,
			type: "each",
			source: "(1095:16) {#each filters[\\\"Input Number\\\"] || [] as { filName, numberValue, maxValue, minValue, defaultValue }",
			ctx
		});

		return block;
	}

	// (963:12) {#each $filterOptions?.filterSelection || [] as { filterSelectionName, filters, isSelected }
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
		let each_value_5 = /*filters*/ ctx[68].Dropdown || [];
		validate_each_argument(each_value_5);
		const get_key = ctx => /*filName*/ ctx[72] + /*dropdownIdx*/ ctx[85];
		validate_each_keys(ctx, each_value_5, get_each_context_5, get_key);

		for (let i = 0; i < each_value_5.length; i += 1) {
			let child_ctx = get_each_context_5(ctx, each_value_5, i);
			let key = get_key(child_ctx);
			each0_lookup.set(key, each_blocks_2[i] = create_each_block_5(key, child_ctx));
		}

		let each_value_4 = /*filters*/ ctx[68].Checkbox || [];
		validate_each_argument(each_value_4);
		const get_key_1 = ctx => /*Checkbox*/ ctx[79].filName + /*checkboxIdx*/ ctx[81];
		validate_each_keys(ctx, each_value_4, get_each_context_4, get_key_1);

		for (let i = 0; i < each_value_4.length; i += 1) {
			let child_ctx = get_each_context_4(ctx, each_value_4, i);
			let key = get_key_1(child_ctx);
			each1_lookup.set(key, each_blocks_1[i] = create_each_block_4(key, child_ctx));
		}

		let each_value_3 = /*filters*/ ctx[68]["Input Number"] || [];
		validate_each_argument(each_value_3);
		const get_key_2 = ctx => /*filName*/ ctx[72] + /*inputNumIdx*/ ctx[78];
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

				if (dirty[0] & /*$filterOptions, maxFilterSelectionHeight, Init, handleFilterSelectOptionChange, filterSelect, closeFilterSelect*/ 57363) {
					each_value_5 = /*filters*/ ctx[68].Dropdown || [];
					validate_each_argument(each_value_5);
					validate_each_keys(ctx, each_value_5, get_each_context_5, get_key);
					each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key, 1, ctx, each_value_5, each0_lookup, t0.parentNode, destroy_block, create_each_block_5, t0, get_each_context_5);
				}

				if (dirty[0] & /*$filterOptions, handleCheckboxChange*/ 65552) {
					each_value_4 = /*filters*/ ctx[68].Checkbox || [];
					validate_each_argument(each_value_4);
					validate_each_keys(ctx, each_value_4, get_each_context_4, get_key_1);
					each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_1, 1, ctx, each_value_4, each1_lookup, t1.parentNode, destroy_block, create_each_block_4, t1, get_each_context_4);
				}

				if (dirty[0] & /*$filterOptions, conditionalInputNumberList, handleInputNumber*/ 132112) {
					each_value_3 = /*filters*/ ctx[68]["Input Number"] || [];
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
			source: "(963:12) {#each $filterOptions?.filterSelection || [] as { filterSelectionName, filters, isSelected }",
			ctx
		});

		return block;
	}

	// (1162:16) {#if selected !== "none"}
	function create_if_block_3(ctx) {
		let div;
		let t0;
		let i;
		let t1;
		let mounted;
		let dispose;

		function select_block_type_5(ctx, dirty) {
			if (/*filterType*/ ctx[62] === "input number") return create_if_block_4;
			return create_else_block_1;
		}

		let current_block_type = select_block_type_5(ctx);
		let if_block = current_block_type(ctx);

		const block = {
			c: function create() {
				div = element("div");
				if_block.c();
				t0 = space();
				i = element("i");
				t1 = space();
				attr_dev(i, "class", "fa-solid fa-xmark svelte-rurued");
				add_location(i, file$1, 1189, 24, 51653);
				attr_dev(div, "class", "activeTagFilter svelte-rurued");

				set_style(div, "--activeTagFilterColor", /*selected*/ ctx[60] === "included"
					? "#5f9ea0"
					: "#e85d75");

				add_location(div, file$1, 1162, 20, 50495);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				if_block.m(div, null);
				append_dev(div, t0);
				append_dev(div, i);
				append_dev(div, t1);

				if (!mounted) {
					dispose = [
						listen_dev(
							i,
							"click",
							prevent_default(function () {
								if (is_function(/*removeActiveTag*/ ctx[19](/*optionIdx*/ ctx[59], /*optionName*/ ctx[58], /*filterType*/ ctx[62], /*categIdx*/ ctx[63]))) /*removeActiveTag*/ ctx[19](/*optionIdx*/ ctx[59], /*optionName*/ ctx[58], /*filterType*/ ctx[62], /*categIdx*/ ctx[63]).apply(this, arguments);
							}),
							false,
							true,
							false,
							false
						),
						listen_dev(
							i,
							"keydown",
							function () {
								if (is_function(/*removeActiveTag*/ ctx[19](/*optionIdx*/ ctx[59], /*optionName*/ ctx[58], /*filterType*/ ctx[62], /*categIdx*/ ctx[63]))) /*removeActiveTag*/ ctx[19](/*optionIdx*/ ctx[59], /*optionName*/ ctx[58], /*filterType*/ ctx[62], /*categIdx*/ ctx[63]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							div,
							"click",
							function () {
								if (is_function(/*changeActiveSelect*/ ctx[18](/*optionIdx*/ ctx[59], /*optionName*/ ctx[58], /*filterType*/ ctx[62], /*categIdx*/ ctx[63], /*changeType*/ ctx[61]))) /*changeActiveSelect*/ ctx[18](/*optionIdx*/ ctx[59], /*optionName*/ ctx[58], /*filterType*/ ctx[62], /*categIdx*/ ctx[63], /*changeType*/ ctx[61]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							div,
							"keydown",
							function () {
								if (is_function(/*changeActiveSelect*/ ctx[18](/*optionIdx*/ ctx[59], /*optionName*/ ctx[58], /*filterType*/ ctx[62], /*categIdx*/ ctx[63], /*changeType*/ ctx[61]))) /*changeActiveSelect*/ ctx[18](/*optionIdx*/ ctx[59], /*optionName*/ ctx[58], /*filterType*/ ctx[62], /*categIdx*/ ctx[63], /*changeType*/ ctx[61]).apply(this, arguments);
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

				if (current_block_type === (current_block_type = select_block_type_5(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(div, t0);
					}
				}

				if (dirty[0] & /*$activeTagFilters, $filterOptions*/ 48) {
					set_style(div, "--activeTagFilterColor", /*selected*/ ctx[60] === "included"
						? "#5f9ea0"
						: "#e85d75");
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(div);
				if_block.d();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3.name,
			type: "if",
			source: "(1162:16) {#if selected !== \\\"none\\\"}",
			ctx
		});

		return block;
	}

	// (1187:24) {:else}
	function create_else_block_1(ctx) {
		let h3;
		let t_value = (/*optionName*/ ctx[58] || "") + "";
		let t;

		const block = {
			c: function create() {
				h3 = element("h3");
				t = text(t_value);
				attr_dev(h3, "class", "svelte-rurued");
				add_location(h3, file$1, 1187, 28, 51569);
			},
			m: function mount(target, anchor) {
				insert_dev(target, h3, anchor);
				append_dev(h3, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*$activeTagFilters, $filterOptions*/ 48 && t_value !== (t_value = (/*optionName*/ ctx[58] || "") + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(h3);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1.name,
			type: "else",
			source: "(1187:24) {:else}",
			ctx
		});

		return block;
	}

	// (1183:24) {#if filterType === "input number"}
	function create_if_block_4(ctx) {
		let h3;
		let t_value = (/*optionName*/ ctx[58] + ": " + /*optionValue*/ ctx[64] || "") + "";
		let t;

		const block = {
			c: function create() {
				h3 = element("h3");
				t = text(t_value);
				attr_dev(h3, "class", "svelte-rurued");
				add_location(h3, file$1, 1183, 28, 51394);
			},
			m: function mount(target, anchor) {
				insert_dev(target, h3, anchor);
				append_dev(h3, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*$activeTagFilters, $filterOptions*/ 48 && t_value !== (t_value = (/*optionName*/ ctx[58] + ": " + /*optionValue*/ ctx[64] || "") + "")) set_data_dev(t, t_value);
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(h3);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4.name,
			type: "if",
			source: "(1183:24) {#if filterType === \\\"input number\\\"}",
			ctx
		});

		return block;
	}

	// (1161:12) {#each $activeTagFilters?.[$filterOptions?.filterSelection?.[$filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected)]?.filterSelectionName] || [] as { optionName, optionIdx, selected, changeType, filterType, categIdx, optionValue }
	function create_each_block_1(key_1, ctx) {
		let first;
		let if_block_anchor;
		let if_block = /*selected*/ ctx[60] !== "none" && create_if_block_3(ctx);

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

				if (/*selected*/ ctx[60] !== "none") {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_3(ctx);
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
			id: create_each_block_1.name,
			type: "each",
			source: "(1161:12) {#each $activeTagFilters?.[$filterOptions?.filterSelection?.[$filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected)]?.filterSelectionName] || [] as { optionName, optionIdx, selected, changeType, filterType, categIdx, optionValue }",
			ctx
		});

		return block;
	}

	// (1209:8) {#if !$activeTagFilters}
	function create_if_block_2(ctx) {
		let i;
		let t;
		let div;

		const block = {
			c: function create() {
				i = element("i");
				t = space();
				div = element("div");
				attr_dev(i, "class", "skeleton shimmer svelte-rurued");
				add_location(i, file$1, 1209, 12, 52419);
				attr_dev(div, "class", "tagFilters skeleton shimmer svelte-rurued");
				add_location(div, file$1, 1210, 12, 52463);
			},
			m: function mount(target, anchor) {
				insert_dev(target, i, anchor);
				insert_dev(target, t, anchor);
				insert_dev(target, div, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(i);
				if (detaching) detach_dev(t);
				if (detaching) detach_dev(div);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2.name,
			type: "if",
			source: "(1209:8) {#if !$activeTagFilters}",
			ctx
		});

		return block;
	}

	// (1269:8) {:else}
	function create_else_block(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "sortFilter skeleton shimmer svelte-rurued");
				add_location(div, file$1, 1269, 12, 55541);
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
			source: "(1269:8) {:else}",
			ctx
		});

		return block;
	}

	// (1213:8) {#if $filterOptions}
	function create_if_block(ctx) {
		let div2;
		let i;
		let i_class_value;
		let t0;
		let h3;
		let t1_value = (/*$filterOptions*/ ctx[4]?.sortFilter?.[/*$filterOptions*/ ctx[4]?.sortFilter.findIndex(func_5)]?.sortName || "") + "";
		let t1;
		let t2;
		let div1;
		let div0;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[1]}px`;
		let mounted;
		let dispose;
		let each_value = /*$filterOptions*/ ctx[4]?.sortFilter || [];
		validate_each_argument(each_value);
		const get_key = ctx => /*sortName*/ ctx[55] + /*sortIdx*/ ctx[57];
		validate_each_keys(ctx, each_value, get_each_context, get_key);

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		const block = {
			c: function create() {
				div2 = element("div");
				i = element("i");
				t0 = space();
				h3 = element("h3");
				t1 = text(t1_value);
				t2 = space();
				div1 = element("div");
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(i, "class", i_class_value = "" + (null_to_empty("fa-duotone fa-sort-" + (/*$filterOptions*/ ctx[4]?.sortFilter?.[/*$filterOptions*/ ctx[4]?.sortFilter?.findIndex(func_4)]?.sortType === "asc"
					? "up"
					: "down")) + " svelte-rurued"));

				add_location(i, file$1, 1214, 16, 52607);
				attr_dev(div0, "class", "options svelte-rurued");
				add_location(div0, file$1, 1241, 24, 53897);
				attr_dev(div1, "class", "options-wrap svelte-rurued");
				set_style(div1, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
				set_style(div1, "visibility", /*selectedSortElement*/ ctx[3] ? "" : "hidden");
				set_style(div1, "pointer-events", /*selectedSortElement*/ ctx[3] ? "" : "none");
				add_location(div1, file$1, 1235, 20, 53547);
				attr_dev(h3, "class", "svelte-rurued");
				add_location(h3, file$1, 1226, 16, 53144);
				attr_dev(div2, "class", "sortFilter svelte-rurued");
				add_location(div2, file$1, 1213, 12, 52565);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, i);
				append_dev(div2, t0);
				append_dev(div2, h3);
				append_dev(h3, t1);
				append_dev(h3, t2);
				append_dev(h3, div1);
				append_dev(div1, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				if (!mounted) {
					dispose = [
						listen_dev(i, "click", /*changeSortType*/ ctx[23], false, false, false, false),
						listen_dev(i, "keydown", /*changeSortType*/ ctx[23], false, false, false, false),
						listen_dev(h3, "click", /*handleSortFilterPopup*/ ctx[21], false, false, false, false),
						listen_dev(h3, "keydown", /*handleSortFilterPopup*/ ctx[21], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*$filterOptions*/ 16 && i_class_value !== (i_class_value = "" + (null_to_empty("fa-duotone fa-sort-" + (/*$filterOptions*/ ctx[4]?.sortFilter?.[/*$filterOptions*/ ctx[4]?.sortFilter?.findIndex(func_4)]?.sortType === "asc"
					? "up"
					: "down")) + " svelte-rurued"))) {
					attr_dev(i, "class", i_class_value);
				}

				if (dirty[0] & /*$filterOptions*/ 16 && t1_value !== (t1_value = (/*$filterOptions*/ ctx[4]?.sortFilter?.[/*$filterOptions*/ ctx[4]?.sortFilter.findIndex(func_5)]?.sortName || "") + "")) set_data_dev(t1, t1_value);

				if (dirty[0] & /*changeSort, $filterOptions*/ 4194320) {
					each_value = /*$filterOptions*/ ctx[4]?.sortFilter || [];
					validate_each_argument(each_value);
					validate_each_keys(ctx, each_value, get_each_context, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div0, destroy_block, create_each_block, null, get_each_context);
				}

				if (dirty[0] & /*maxFilterSelectionHeight*/ 2 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[1]}px`)) {
					set_style(div1, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
				}

				if (dirty[0] & /*selectedSortElement*/ 8) {
					set_style(div1, "visibility", /*selectedSortElement*/ ctx[3] ? "" : "hidden");
				}

				if (dirty[0] & /*selectedSortElement*/ 8) {
					set_style(div1, "pointer-events", /*selectedSortElement*/ ctx[3] ? "" : "none");
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
			id: create_if_block.name,
			type: "if",
			source: "(1213:8) {#if $filterOptions}",
			ctx
		});

		return block;
	}

	// (1250:36) {#if $filterOptions?.sortFilter?.[$filterOptions?.sortFilter?.findIndex(({ sortType }) => sortType !== "none")].sortName === sortName && sortName}
	function create_if_block_1(ctx) {
		let i;
		let i_class_value;

		const block = {
			c: function create() {
				i = element("i");

				attr_dev(i, "class", i_class_value = "" + (null_to_empty("fa-duotone fa-sort-" + (/*$filterOptions*/ ctx[4]?.sortFilter?.[/*$filterOptions*/ ctx[4]?.sortFilter?.findIndex(func_6)].sortType === "asc"
					? "up"
					: "down")) + " svelte-rurued"));

				add_location(i, file$1, 1250, 40, 54588);
			},
			m: function mount(target, anchor) {
				insert_dev(target, i, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*$filterOptions*/ 16 && i_class_value !== (i_class_value = "" + (null_to_empty("fa-duotone fa-sort-" + (/*$filterOptions*/ ctx[4]?.sortFilter?.[/*$filterOptions*/ ctx[4]?.sortFilter?.findIndex(func_6)].sortType === "asc"
					? "up"
					: "down")) + " svelte-rurued"))) {
					attr_dev(i, "class", i_class_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(i);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1.name,
			type: "if",
			source: "(1250:36) {#if $filterOptions?.sortFilter?.[$filterOptions?.sortFilter?.findIndex(({ sortType }) => sortType !== \\\"none\\\")].sortName === sortName && sortName}",
			ctx
		});

		return block;
	}

	// (1243:28) {#each $filterOptions?.sortFilter || [] as { sortName }
	function create_each_block(key_1, ctx) {
		let div;
		let h3;
		let t0_value = (/*sortName*/ ctx[55] || "") + "";
		let t0;
		let t1;
		let show_if = /*$filterOptions*/ ctx[4]?.sortFilter?.[/*$filterOptions*/ ctx[4]?.sortFilter?.findIndex(func)].sortName === /*sortName*/ ctx[55] && /*sortName*/ ctx[55];
		let t2;
		let mounted;
		let dispose;
		let if_block = show_if && create_if_block_1(ctx);

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
				attr_dev(h3, "class", "svelte-rurued");
				add_location(h3, file$1, 1248, 36, 54337);
				attr_dev(div, "class", "option svelte-rurued");
				add_location(div, file$1, 1243, 32, 54068);
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
								if (is_function(/*changeSort*/ ctx[22](/*sortName*/ ctx[55]))) /*changeSort*/ ctx[22](/*sortName*/ ctx[55]).apply(this, arguments);
							},
							false,
							false,
							false,
							false
						),
						listen_dev(
							div,
							"keydown",
							function () {
								if (is_function(/*changeSort*/ ctx[22](/*sortName*/ ctx[55]))) /*changeSort*/ ctx[22](/*sortName*/ ctx[55]).apply(this, arguments);
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
				if (dirty[0] & /*$filterOptions*/ 16 && t0_value !== (t0_value = (/*sortName*/ ctx[55] || "") + "")) set_data_dev(t0, t0_value);
				if (dirty[0] & /*$filterOptions*/ 16) show_if = /*$filterOptions*/ ctx[4]?.sortFilter?.[/*$filterOptions*/ ctx[4]?.sortFilter?.findIndex(func)].sortName === /*sortName*/ ctx[55] && /*sortName*/ ctx[55];

				if (show_if) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_1(ctx);
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
			source: "(1243:28) {#each $filterOptions?.sortFilter || [] as { sortName }",
			ctx
		});

		return block;
	}

	function create_fragment$1(ctx) {
		let main;
		let div2;
		let input;
		let t0;
		let div1;
		let i0;
		let t1;
		let div0;
		let style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[1]}px`;
		let t2;
		let div3;
		let t3;
		let t4;
		let div4;
		let style___maxPaddingHeight = `${window.innerHeight}px`;
		let t5;
		let div6;
		let i1;
		let t6;
		let div5;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let t7;
		let t8;
		let current;
		let mounted;
		let dispose;
		let if_block0 = /*$filterOptions*/ ctx[4] && create_if_block_14(ctx);

		function select_block_type(ctx, dirty) {
			if (/*$filterOptions*/ ctx[4]) return create_if_block_13;
			return create_else_block_5;
		}

		let current_block_type = select_block_type(ctx);
		let if_block1 = current_block_type(ctx);
		let if_block2 = (/*$dataStatus*/ ctx[6] || !/*$username*/ ctx[8]) && create_if_block_10(ctx);

		function select_block_type_2(ctx, dirty) {
			if (/*$filterOptions*/ ctx[4]) return create_if_block_5;
			return create_else_block_3;
		}

		let current_block_type_1 = select_block_type_2(ctx);
		let if_block3 = current_block_type_1(ctx);
		let each_value_1 = /*$activeTagFilters*/ ctx[5]?.[/*$filterOptions*/ ctx[4]?.filterSelection?.[/*$filterOptions*/ ctx[4]?.filterSelection?.findIndex(func_3)]?.filterSelectionName] || [];
		validate_each_argument(each_value_1);
		const get_key = ctx => /*optionName*/ ctx[58] + /*optionIdx*/ ctx[59];
		validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

		for (let i = 0; i < each_value_1.length; i += 1) {
			let child_ctx = get_each_context_1(ctx, each_value_1, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
		}

		let if_block4 = !/*$activeTagFilters*/ ctx[5] && create_if_block_2(ctx);

		function select_block_type_6(ctx, dirty) {
			if (/*$filterOptions*/ ctx[4]) return create_if_block;
			return create_else_block;
		}

		let current_block_type_2 = select_block_type_6(ctx);
		let if_block5 = current_block_type_2(ctx);

		const block = {
			c: function create() {
				main = element("main");
				div2 = element("div");
				input = element("input");
				t0 = space();
				div1 = element("div");
				i0 = element("i");
				t1 = space();
				div0 = element("div");
				if (if_block0) if_block0.c();
				t2 = space();
				div3 = element("div");
				if_block1.c();
				t3 = space();
				if (if_block2) if_block2.c();
				t4 = space();
				div4 = element("div");
				if_block3.c();
				t5 = space();
				div6 = element("div");
				i1 = element("i");
				t6 = space();
				div5 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t7 = space();
				if (if_block4) if_block4.c();
				t8 = space();
				if_block5.c();
				attr_dev(input, "id", "input-search");
				attr_dev(input, "class", "input-search svelte-rurued");
				attr_dev(input, "type", "search");
				attr_dev(input, "enterkeyhint", "search");
				attr_dev(input, "autocomplete", "off");
				attr_dev(input, "placeholder", "Search");
				add_location(input, file$1, 883, 8, 37129);
				attr_dev(i0, "class", "fa-solid fa-sliders svelte-rurued");
				add_location(i0, file$1, 893, 12, 37436);
				attr_dev(div0, "class", "options-wrap svelte-rurued");
				set_style(div0, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
				set_style(div0, "visibility", /*selectedFilterTypeElement*/ ctx[2] ? "" : "hidden");
				set_style(div0, "pointer-events", /*selectedFilterTypeElement*/ ctx[2] ? "" : "none");
				add_location(div0, file$1, 898, 12, 37615);
				attr_dev(div1, "class", "filterType svelte-rurued");
				add_location(div1, file$1, 892, 8, 37398);
				attr_dev(div2, "class", "input-search-wrap svelte-rurued");
				add_location(div2, file$1, 882, 4, 37088);
				attr_dev(div3, "class", "home-status svelte-rurued");
				add_location(div3, file$1, 930, 4, 39067);
				attr_dev(div4, "class", "filters svelte-rurued");
				attr_dev(div4, "id", "filters");
				set_style(div4, "--maxPaddingHeight", style___maxPaddingHeight);
				add_location(div4, file$1, 956, 4, 39948);
				attr_dev(i1, "class", "fa-solid fa-ban svelte-rurued");
				attr_dev(i1, "title", "Remove Filters");
				set_style(i1, "display", /*$activeTagFilters*/ ctx[5] ? "" : "none");

				set_style(i1, "visibility", (/*$activeTagFilters*/ ctx[5]?.[/*$filterOptions*/ ctx[4]?.filterSelection?.[/*$filterOptions*/ ctx[4]?.filterSelection?.findIndex(func_2)]?.filterSelectionName]?.length)
					? "visible"
					: "hidden");

				add_location(i1, file$1, 1139, 8, 49388);
				attr_dev(div5, "id", "tagFilters");
				attr_dev(div5, "class", "tagFilters svelte-rurued");
				set_style(div5, "display", /*$activeTagFilters*/ ctx[5] ? "" : "none");
				add_location(div5, file$1, 1155, 8, 50003);
				attr_dev(div6, "class", "activeFilters svelte-rurued");
				add_location(div6, file$1, 1138, 4, 49351);
				attr_dev(main, "class", "svelte-rurued");
				add_location(main, file$1, 881, 0, 37076);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, main, anchor);
				append_dev(main, div2);
				append_dev(div2, input);
				set_input_value(input, /*$searchedAnimeKeyword*/ ctx[7]);
				append_dev(div2, t0);
				append_dev(div2, div1);
				append_dev(div1, i0);
				append_dev(div1, t1);
				append_dev(div1, div0);
				if (if_block0) if_block0.m(div0, null);
				append_dev(main, t2);
				append_dev(main, div3);
				if_block1.m(div3, null);
				append_dev(div3, t3);
				if (if_block2) if_block2.m(div3, null);
				append_dev(main, t4);
				append_dev(main, div4);
				if_block3.m(div4, null);
				append_dev(main, t5);
				append_dev(main, div6);
				append_dev(div6, i1);
				append_dev(div6, t6);
				append_dev(div6, div5);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div5, null);
					}
				}

				append_dev(div6, t7);
				if (if_block4) if_block4.m(div6, null);
				append_dev(div6, t8);
				if_block5.m(div6, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(input, "input", /*input_input_handler*/ ctx[24]),
						listen_dev(i0, "click", /*handleShowFilterTypes*/ ctx[12], false, false, false, false),
						listen_dev(i0, "keydown", /*handleShowFilterTypes*/ ctx[12], false, false, false, false),
						listen_dev(i1, "click", /*removeAllActiveTag*/ ctx[20], false, false, false, false),
						listen_dev(i1, "keydown", /*removeAllActiveTag*/ ctx[20], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*$searchedAnimeKeyword*/ 128 && input.value !== /*$searchedAnimeKeyword*/ ctx[7]) {
					set_input_value(input, /*$searchedAnimeKeyword*/ ctx[7]);
				}

				if (/*$filterOptions*/ ctx[4]) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_14(ctx);
						if_block0.c();
						if_block0.m(div0, null);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (dirty[0] & /*maxFilterSelectionHeight*/ 2 && style___maxFilterSelectionHeight !== (style___maxFilterSelectionHeight = `${/*maxFilterSelectionHeight*/ ctx[1]}px`)) {
					set_style(div0, "--maxFilterSelectionHeight", style___maxFilterSelectionHeight);
				}

				if (dirty[0] & /*selectedFilterTypeElement*/ 4) {
					set_style(div0, "visibility", /*selectedFilterTypeElement*/ ctx[2] ? "" : "hidden");
				}

				if (dirty[0] & /*selectedFilterTypeElement*/ 4) {
					set_style(div0, "pointer-events", /*selectedFilterTypeElement*/ ctx[2] ? "" : "none");
				}

				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1.d(1);
					if_block1 = current_block_type(ctx);

					if (if_block1) {
						if_block1.c();
						if_block1.m(div3, t3);
					}
				}

				if (/*$dataStatus*/ ctx[6] || !/*$username*/ ctx[8]) {
					if (if_block2) {
						if_block2.p(ctx, dirty);

						if (dirty[0] & /*$dataStatus, $username*/ 320) {
							transition_in(if_block2, 1);
						}
					} else {
						if_block2 = create_if_block_10(ctx);
						if_block2.c();
						transition_in(if_block2, 1);
						if_block2.m(div3, null);
					}
				} else if (if_block2) {
					group_outros();

					transition_out(if_block2, 1, 1, () => {
						if_block2 = null;
					});

					check_outros();
				}

				if (current_block_type_1 === (current_block_type_1 = select_block_type_2(ctx)) && if_block3) {
					if_block3.p(ctx, dirty);
				} else {
					if_block3.d(1);
					if_block3 = current_block_type_1(ctx);

					if (if_block3) {
						if_block3.c();
						if_block3.m(div4, null);
					}
				}

				if (dirty[0] & /*$activeTagFilters*/ 32) {
					set_style(i1, "display", /*$activeTagFilters*/ ctx[5] ? "" : "none");
				}

				if (dirty[0] & /*$activeTagFilters, $filterOptions*/ 48) {
					set_style(i1, "visibility", (/*$activeTagFilters*/ ctx[5]?.[/*$filterOptions*/ ctx[4]?.filterSelection?.[/*$filterOptions*/ ctx[4]?.filterSelection?.findIndex(func_2)]?.filterSelectionName]?.length)
						? "visible"
						: "hidden");
				}

				if (dirty[0] & /*$activeTagFilters, $filterOptions, changeActiveSelect, removeActiveTag*/ 786480) {
					each_value_1 = /*$activeTagFilters*/ ctx[5]?.[/*$filterOptions*/ ctx[4]?.filterSelection?.[/*$filterOptions*/ ctx[4]?.filterSelection?.findIndex(func_3)]?.filterSelectionName] || [];
					validate_each_argument(each_value_1);
					validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div5, destroy_block, create_each_block_1, null, get_each_context_1);
				}

				if (dirty[0] & /*$activeTagFilters*/ 32) {
					set_style(div5, "display", /*$activeTagFilters*/ ctx[5] ? "" : "none");
				}

				if (!/*$activeTagFilters*/ ctx[5]) {
					if (if_block4); else {
						if_block4 = create_if_block_2(ctx);
						if_block4.c();
						if_block4.m(div6, t8);
					}
				} else if (if_block4) {
					if_block4.d(1);
					if_block4 = null;
				}

				if (current_block_type_2 === (current_block_type_2 = select_block_type_6(ctx)) && if_block5) {
					if_block5.p(ctx, dirty);
				} else {
					if_block5.d(1);
					if_block5 = current_block_type_2(ctx);

					if (if_block5) {
						if_block5.c();
						if_block5.m(div6, null);
					}
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
				if (detaching) detach_dev(main);
				if (if_block0) if_block0.d();
				if_block1.d();
				if (if_block2) if_block2.d();
				if_block3.d();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				if (if_block4) if_block4.d();
				if_block5.d();
				mounted = false;
				run_all(dispose);
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

	function hasPartialMatch(strings, searchString) {
		if (typeof strings === "string" && typeof searchString === "string") {
			return strings.toLowerCase().includes(searchString.toLowerCase());
		}
	}

	// onDestroy(() => {
	//     writableSubscriptions.forEach((unsub) => unsub());
	//     filterOptionsUnsubscribe();
	//     unsubTagFiltersDragScroll();
	//     unsubFilterDragScroll();
	//     document.removeEventListener("keydown", handleDropdownKeyDown);
	//     if (tagFilterScrollTimeout) clearTimeout(tagFilterScrollTimeout);
	//     document
	//         .getElementsByClassName("tagFilters")[0]
	//         .removeEventListener("scroll", handleTagFilterScroll);
	//     window.removeEventListener("resize", windowResized);
	//     window.removeEventListener("pointerdown", clickOutsideListener);
	// });
	// Helper
	function getIndexInParent(element) {
		if (!element) return;
		return Array.from(element.parentNode.children).indexOf(element);
	}

	const func = ({ sortType }) => sortType !== "none";
	const func_1 = ({ isSelected }) => isSelected;
	const func_2 = ({ isSelected }) => isSelected;
	const func_3 = ({ isSelected }) => isSelected;
	const func_4 = ({ sortType }) => sortType !== "none";
	const func_5 = ({ sortType }) => sortType !== "none";
	const func_6 = ({ sortType }) => sortType !== "none";

	function instance$1($$self, $$props, $$invalidate) {
		let $filterOptions;
		let $activeTagFilters;
		let $loadAnime;
		let $dataStatus;
		let $finalAnimeList;
		let $animeLoaderWorker;
		let $updateRecommendationList;
		let $searchedAnimeKeyword;
		let $username;
		let $initData;
		validate_store(filterOptions, 'filterOptions');
		component_subscribe($$self, filterOptions, $$value => $$invalidate(4, $filterOptions = $$value));
		validate_store(activeTagFilters, 'activeTagFilters');
		component_subscribe($$self, activeTagFilters, $$value => $$invalidate(5, $activeTagFilters = $$value));
		validate_store(loadAnime, 'loadAnime');
		component_subscribe($$self, loadAnime, $$value => $$invalidate(43, $loadAnime = $$value));
		validate_store(dataStatus, 'dataStatus');
		component_subscribe($$self, dataStatus, $$value => $$invalidate(6, $dataStatus = $$value));
		validate_store(finalAnimeList, 'finalAnimeList');
		component_subscribe($$self, finalAnimeList, $$value => $$invalidate(44, $finalAnimeList = $$value));
		validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
		component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(45, $animeLoaderWorker = $$value));
		validate_store(updateRecommendationList, 'updateRecommendationList');
		component_subscribe($$self, updateRecommendationList, $$value => $$invalidate(46, $updateRecommendationList = $$value));
		validate_store(searchedAnimeKeyword, 'searchedAnimeKeyword');
		component_subscribe($$self, searchedAnimeKeyword, $$value => $$invalidate(7, $searchedAnimeKeyword = $$value));
		validate_store(username, 'username');
		component_subscribe($$self, username, $$value => $$invalidate(8, $username = $$value));
		validate_store(initData, 'initData');
		component_subscribe($$self, initData, $$value => $$invalidate(9, $initData = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('Search', slots, []);
		let Init = true;
		let maxFilterSelectionHeight;
		let unsubFilterDragScroll;
		let unsubTagFiltersDragScroll;
		let selectedFilterTypeElement;
		let selectedFilterElement;
		let selectedSortElement;
		let highlightedEl;
		let filterScrollTimeout;
		let filterIsScrolling;
		let tagFilterScrollTimeout;
		let tagFilterIsScrolling;
		let nameChangeUpdateProcessedList = ["Algorithm Filter"];
		let nameChangeUpdateFinalList = ["sort", "Anime Filter", "Content Caution"];
		let conditionalInputNumberList = ["weighted score", "score", "average score", "user score", "popularity"];
		let saveFiltersTimeout;
		let lastChangeName;

		function saveFilters(changeName) {
			if (saveFiltersTimeout && lastChangeName === changeName) {
				clearTimeout(saveFiltersTimeout);
			}

			lastChangeName = changeName;

			saveFiltersTimeout = setTimeout(
				async () => {
					if (nameChangeUpdateProcessedList.includes(changeName)) {
						if ($animeLoaderWorker) {
							$animeLoaderWorker.terminate();
							set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
						}

						set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);
						set_store_value(dataStatus, $dataStatus = "Updating List", $dataStatus);
						await saveJSON(true, "shouldProcessRecommendation");
						await saveJSON($filterOptions, "filterOptions");
						await saveJSON($activeTagFilters, "activeTagFilters");
						set_store_value(updateRecommendationList, $updateRecommendationList = !$updateRecommendationList, $updateRecommendationList);
					} else if (nameChangeUpdateFinalList.includes(changeName)) {
						if ($animeLoaderWorker) {
							$animeLoaderWorker.terminate();
							set_store_value(animeLoaderWorker$1, $animeLoaderWorker = null, $animeLoaderWorker);
						}

						set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);
						set_store_value(dataStatus, $dataStatus = "Updating List", $dataStatus);
						await saveJSON($filterOptions, "filterOptions");
						await saveJSON($activeTagFilters, "activeTagFilters");
						set_store_value(loadAnime, $loadAnime = !$loadAnime, $loadAnime);
					} else {
						await saveJSON($filterOptions, "filterOptions");
						await saveJSON($activeTagFilters, "activeTagFilters");
					}
				},
				300
			);
		}

		function windowResized() {
			$$invalidate(1, maxFilterSelectionHeight = window.innerHeight * 0.3);
		}

		function handleFilterTypes(newFilterTypeName) {
			let idxTypeSelected = $filterOptions?.filterSelection.findIndex(({ isSelected }) => isSelected);
			let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;

			if (nameTypeSelected !== newFilterTypeName) {
				// Close Filter Dropdown
				$$invalidate(3, selectedSortElement = false);

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
				saveFilters();
			}
		}

		function handleShowFilterTypes(event) {
			if ($filterOptions?.filterSelection?.length < 1) return;
			let element = event.target;
			let classList = element.classList;
			let filterTypEl = element.closest(".filterType");
			let optionsWrap = element.closest(".options-wrap");

			if ((classList.contains("filterType") || filterTypEl) && !selectedFilterTypeElement) {
				$$invalidate(2, selectedFilterTypeElement = true);
			} else if (!optionsWrap && !classList.contains("options-wrap")) {
				$$invalidate(2, selectedFilterTypeElement = false);
			}
		}

		function handleTagFilterScroll() {
			if (tagFilterScrollTimeout) clearTimeout(tagFilterScrollTimeout);
			tagFilterIsScrolling = true;

			tagFilterScrollTimeout = setTimeout(
				() => {
					tagFilterIsScrolling = false;
				},
				500
			);
		}

		function handleFilterScroll() {
			if (filterScrollTimeout) clearTimeout(filterScrollTimeout);
			filterIsScrolling = true;

			filterScrollTimeout = setTimeout(
				() => {
					filterIsScrolling = false;
				},
				50
			);
		}

		function filterSelect(event, dropdownIdx) {
			if (filterIsScrolling) return;
			let element = event.target;
			let filSelectEl = element.closest(".filter-select");
			if (filSelectEl === selectedFilterElement) return;
			let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);

			if (selectedFilterElement instanceof Element) {
				let selectedIndex = getIndexInParent(selectedFilterElement);
				if (element.classList.contains("icon") && $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[selectedIndex].selected) return;
				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[selectedIndex].selected = false, $filterOptions);
			}

			if (Init) $$invalidate(0, Init = false);
			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].selected = true, $filterOptions);
			selectedFilterElement = filSelectEl;
		}

		function closeFilterSelect(dropDownIdx) {
			let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
			set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropDownIdx].selected = false, $filterOptions);
			selectedFilterElement = null;
		}

		function clickOutsideListener(event) {
			if ($filterOptions?.filterSelection?.length < 1 || !$filterOptions) return;
			let element = event.target;
			let classList = element.classList;

			// Filter Type Dropdown
			let filterTypeEl = element.closest(".filterType");

			if (!classList.contains("filterType") && !filterTypeEl) {
				$$invalidate(2, selectedFilterTypeElement = false);

				if (highlightedEl instanceof Element) {
					highlightedEl.style.backgroundColor = "";
					highlightedEl = null;
				}
			}

			// Sort Filter Dropdown
			let sortSelectEl = element.closest(".sortFilter");

			if (!classList.contains("sortFilter") && !sortSelectEl) {
				$$invalidate(3, selectedSortElement = false);

				if (highlightedEl instanceof Element) {
					highlightedEl.style.backgroundColor = "";
					highlightedEl = null;
				}
			}

			// Filter Selection Dropdown
			let filterSelectEl = element.closest(".filter-select");

			let filterNameEl = element.closest(".filter-name");

			if (filterSelectEl !== selectedFilterElement || filterNameEl || classList.contains("filter-name")) {
				let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);

				$filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown.forEach(e => {
					e.selected = false;
				});

				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
				selectedFilterElement = null;

				if (highlightedEl instanceof Element) {
					highlightedEl.style.backgroundColor = "";
					highlightedEl = null;
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
			let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
			let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;
			let currentValue = $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected;

			if (currentValue === "none" || currentValue === true) {
				// true is default value of selections
				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "included", $filterOptions);

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
					set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === "dropdown" && e.categIdx === dropdownIdx)), $activeTagFilters);
				} else {
					set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "excluded", $filterOptions);

					set_store_value(
						activeTagFilters,
						$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
							if (e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === "dropdown" && e.categIdx === dropdownIdx && e.selected === "included") {
								e.selected = "excluded";
							}

							return e;
						}),
						$activeTagFilters
					);
				}
			} else {
				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[dropdownIdx].options[optionIdx].selected = "none", $filterOptions);
				set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === optionIdx && e.optionName === optionName && e.filterType === "dropdown" && e.categIdx === dropdownIdx)), $activeTagFilters);
			}

			saveFilters(filterSelectionName);
		}

		function handleCheckboxChange(event, checkBoxName, checkboxIdx, filterSelectionName) {
			let element = event.target;
			let classList = element.classList;
			let keyCode = event.which || event.keyCode || 0;
			if (classList.contains("checkbox") && event.type === "click" || classList.contains("checkbox") && keyCode !== 13 && event.type === "keydown") return; // Prevent Default
			let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
			let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;
			let currentCheckBoxStatus = $filterOptions?.filterSelection?.[idxTypeSelected].filters.Checkbox[checkboxIdx].isSelected;

			if (currentCheckBoxStatus) {
				set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === checkboxIdx && e.optionName === checkBoxName && e.filterType === "checkbox" && e.selected === "included")), $activeTagFilters);
			} else {
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
							set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === inputNumIdx && e.optionName === inputNumberName && e.optionValue === currentValue && e.filterType === "input number" && e.selected === "included")), $activeTagFilters);
						} else {
							let elementIdx = $activeTagFilters[nameTypeSelected].findIndex(item => item.optionName === inputNumberName && item.optionValue === currentValue && item.optionIdx === inputNumIdx && item.filterType === "input number");

							if (elementIdx === -1) {
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
					changeInputValue(event.target, currentValue);
				}
			} else {
				if (newValue !== currentValue && (!isNaN(newValue) && (parseFloat(newValue) >= minValue || typeof minValue !== "number") && (parseFloat(newValue) <= maxValue || typeof maxValue !== "number") || newValue === "")) {
					if (newValue === "") {
						set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionIdx === inputNumIdx && e.optionName === inputNumberName && e.optionValue === currentValue && e.filterType === "input number" && e.selected === "included")), $activeTagFilters);
					} else {
						let elementIdx = $activeTagFilters[nameTypeSelected].findIndex(item => item.optionName === inputNumberName && item.optionValue === currentValue && item.optionIdx === inputNumIdx && item.filterType === "input number");

						if (elementIdx === -1) {
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
					changeInputValue(event.target, currentValue);
				}
			}
		}

		function changeActiveSelect(optionIdx, optionName, filterType, categIdx, changeType) {
			if (tagFilterIsScrolling) return false;
			if (changeType === "read" || filterType !== "dropdown") return; // Unchangable Selection
			let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
			let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;
			let currentSelect = $filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected;

			if (currentSelect === "included") {
				set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected].filters.Dropdown[categIdx].options[optionIdx].selected = "excluded", $filterOptions);

				set_store_value(
					activeTagFilters,
					$activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].map(e => {
						if (e.optionIdx === optionIdx && e.optionName === optionName && e.selected === "included") {
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
						if (e.optionIdx === optionIdx && e.optionName === optionName && e.selected === "excluded") {
							e.selected = "included";
						}

						return e;
					}),
					$activeTagFilters
				);
			}

			saveFilters(nameTypeSelected);
		}

		function removeActiveTag(optionIdx, optionName, filterType, categIdx) {
			if (tagFilterIsScrolling) return;
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

			set_store_value(activeTagFilters, $activeTagFilters[nameTypeSelected] = $activeTagFilters[nameTypeSelected].filter(e => !(e.optionName === optionName && e.optionIdx === optionIdx && e.filterType === filterType)), $activeTagFilters);
			saveFilters(nameTypeSelected);
		}

		function removeAllActiveTag() {
			if (tagFilterIsScrolling) return false;

			if (confirm("Do you want to remove all filters?") === true) {
				let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
				let nameTypeSelected = $filterOptions?.filterSelection?.[idxTypeSelected].filterSelectionName;

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
				$$invalidate(3, selectedSortElement = true);
			} else if (!optionsWrap && !classList.contains("options-wrap")) {
				$$invalidate(3, selectedSortElement = false);
			}
		}

		function changeSort(newSortName) {
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
		}

		function changeSortType() {
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
				var element = Array.from(document.getElementsByClassName("options-wrap") || []).find(el => getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden");

				// let element =
				document.getElementsByClassName("options-wrap")?.[0];

				if (element?.closest?.(".filterType") || element?.closest?.(".sortFilter") || element?.closest?.(".filter-select")) {
					event.preventDefault();

					// handle sortFilter
					if (highlightedEl instanceof Element && highlightedEl?.closest?.(".options")?.children?.length) {
						let parent = highlightedEl.closest(".options");
						let idx = Array.from(parent.children).indexOf(highlightedEl);

						let nextIdx = keyCode === 38
							? idx <= 0 ? parent.children.length - 1 : idx - 1
							: idx >= parent.children.length - 1 ? 0 : idx + 1;

						let currentHighlightedEl = highlightedEl;
						highlightedEl = parent.children?.[nextIdx];

						if (highlightedEl instanceof Element) {
							currentHighlightedEl.style.backgroundColor = "";
							highlightedEl.style.backgroundColor = "rgba(0,0,0,0.25)";

							highlightedEl.scrollIntoView({
								behavior: nextIdx === 0 || nextIdx === parent.children.length - 1
									? "auto"
									: "smooth",
								container: parent,
								block: "nearest",
								inline: "end"
							});
						}
					} else {
						let options = element.querySelector(".options");
						highlightedEl = options?.children?.[0];

						if (highlightedEl instanceof Element) {
							highlightedEl.style.backgroundColor = "rgba(0,0,0,0.25)";
						}
					}
				}
			} else if (keyCode === 13) {
				if (highlightedEl instanceof Element) {
					let keydownEvent = new KeyboardEvent("keydown", { key: "Enter" });
					highlightedEl.dispatchEvent(keydownEvent);
				}
			} else {
				var element = Array.from(document.getElementsByClassName("options-wrap") || []).find(el => getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden");
				if (element?.closest?.(".filter-select") && keyCode !== 9) return;
				let idxTypeSelected = $filterOptions?.filterSelection?.findIndex(({ isSelected }) => isSelected);
				$$invalidate(2, selectedFilterTypeElement = null);
				$$invalidate(3, selectedSortElement = null);

				if ($filterOptions?.filterSelection?.length > 0) {
					$filterOptions?.filterSelection?.[idxTypeSelected].filters.Dropdown.forEach(e => {
						e.selected = false;
					});

					set_store_value(filterOptions, $filterOptions.filterSelection[idxTypeSelected] = $filterOptions?.filterSelection?.[idxTypeSelected], $filterOptions);
				}

				selectedFilterElement = null;

				if (highlightedEl instanceof Element) {
					highlightedEl.style.backgroundColor = "";
					highlightedEl = null;
				}
			}
		}

		onMount(() => {
			// Init
			$$invalidate(1, maxFilterSelectionHeight = window.innerHeight * 0.3);

			let filterEl = document.getElementById("filters");
			filterEl.addEventListener("scroll", handleFilterScroll);
			unsubFilterDragScroll = dragScroll(filterEl, "x");
			let tagFilterEl = document.getElementById("tagFilters");
			tagFilterEl.addEventListener("scroll", handleTagFilterScroll);
			unsubTagFiltersDragScroll = dragScroll(tagFilterEl, "x");
			document.addEventListener("keydown", handleDropdownKeyDown);
			window.addEventListener("resize", windowResized);
			window.addEventListener("pointerdown", clickOutsideListener);
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Search> was created with unknown prop '${key}'`);
		});

		function input_input_handler() {
			$searchedAnimeKeyword = this.value;
			searchedAnimeKeyword.set($searchedAnimeKeyword);
		}

		function input_input_handler_1(filSelIdx, dropdownIdx) {
			$filterOptions.filterSelection[filSelIdx].filters.Dropdown[dropdownIdx].optKeyword = this.value;
			filterOptions.set($filterOptions);
		}

		const keydown_handler = (dropdownIdx, e) => filterSelect(e, dropdownIdx);
		const click_handler = (dropdownIdx, e) => filterSelect(e, dropdownIdx);
		const change_handler = (Checkbox, checkboxIdx, filterSelectionName, e) => handleCheckboxChange(e, Checkbox.filName, checkboxIdx, filterSelectionName);

		function input_change_handler(each_value_4, checkboxIdx) {
			each_value_4[checkboxIdx].isSelected = this.checked;
		}

		const click_handler_1 = (Checkbox, checkboxIdx, filterSelectionName, e) => handleCheckboxChange(e, Checkbox.filName, checkboxIdx, filterSelectionName);
		const keydown_handler_1 = (Checkbox, checkboxIdx, filterSelectionName, e) => handleCheckboxChange(e, Checkbox.filName, checkboxIdx, filterSelectionName);
		const input_handler = (inputNumIdx, filName, maxValue, minValue, filterSelectionName, e) => handleInputNumber(e, e.target.value, inputNumIdx, filName, maxValue, minValue, filterSelectionName);

		$$self.$capture_state = () => ({
			onMount,
			onDestroy,
			IDBinit,
			retrieveJSON,
			saveJSON,
			finalAnimeList,
			animeLoaderWorker: animeLoaderWorker$1,
			filterOptions,
			activeTagFilters,
			searchedAnimeKeyword,
			dataStatus,
			updateRecommendationList,
			loadAnime,
			username,
			initData,
			fade,
			changeInputValue,
			dragScroll,
			Init,
			maxFilterSelectionHeight,
			unsubFilterDragScroll,
			unsubTagFiltersDragScroll,
			selectedFilterTypeElement,
			selectedFilterElement,
			selectedSortElement,
			highlightedEl,
			filterScrollTimeout,
			filterIsScrolling,
			tagFilterScrollTimeout,
			tagFilterIsScrolling,
			nameChangeUpdateProcessedList,
			nameChangeUpdateFinalList,
			conditionalInputNumberList,
			saveFiltersTimeout,
			lastChangeName,
			saveFilters,
			windowResized,
			handleFilterTypes,
			handleShowFilterTypes,
			handleTagFilterScroll,
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
			hasPartialMatch,
			getIndexInParent,
			$filterOptions,
			$activeTagFilters,
			$loadAnime,
			$dataStatus,
			$finalAnimeList,
			$animeLoaderWorker,
			$updateRecommendationList,
			$searchedAnimeKeyword,
			$username,
			$initData
		});

		$$self.$inject_state = $$props => {
			if ('Init' in $$props) $$invalidate(0, Init = $$props.Init);
			if ('maxFilterSelectionHeight' in $$props) $$invalidate(1, maxFilterSelectionHeight = $$props.maxFilterSelectionHeight);
			if ('unsubFilterDragScroll' in $$props) unsubFilterDragScroll = $$props.unsubFilterDragScroll;
			if ('unsubTagFiltersDragScroll' in $$props) unsubTagFiltersDragScroll = $$props.unsubTagFiltersDragScroll;
			if ('selectedFilterTypeElement' in $$props) $$invalidate(2, selectedFilterTypeElement = $$props.selectedFilterTypeElement);
			if ('selectedFilterElement' in $$props) selectedFilterElement = $$props.selectedFilterElement;
			if ('selectedSortElement' in $$props) $$invalidate(3, selectedSortElement = $$props.selectedSortElement);
			if ('highlightedEl' in $$props) highlightedEl = $$props.highlightedEl;
			if ('filterScrollTimeout' in $$props) filterScrollTimeout = $$props.filterScrollTimeout;
			if ('filterIsScrolling' in $$props) filterIsScrolling = $$props.filterIsScrolling;
			if ('tagFilterScrollTimeout' in $$props) tagFilterScrollTimeout = $$props.tagFilterScrollTimeout;
			if ('tagFilterIsScrolling' in $$props) tagFilterIsScrolling = $$props.tagFilterIsScrolling;
			if ('nameChangeUpdateProcessedList' in $$props) nameChangeUpdateProcessedList = $$props.nameChangeUpdateProcessedList;
			if ('nameChangeUpdateFinalList' in $$props) nameChangeUpdateFinalList = $$props.nameChangeUpdateFinalList;
			if ('conditionalInputNumberList' in $$props) $$invalidate(10, conditionalInputNumberList = $$props.conditionalInputNumberList);
			if ('saveFiltersTimeout' in $$props) saveFiltersTimeout = $$props.saveFiltersTimeout;
			if ('lastChangeName' in $$props) lastChangeName = $$props.lastChangeName;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			Init,
			maxFilterSelectionHeight,
			selectedFilterTypeElement,
			selectedSortElement,
			$filterOptions,
			$activeTagFilters,
			$dataStatus,
			$searchedAnimeKeyword,
			$username,
			$initData,
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
			input_input_handler,
			input_input_handler_1,
			keydown_handler,
			click_handler,
			change_handler,
			input_change_handler,
			click_handler_1,
			keydown_handler_1,
			input_handler
		];
	}

	class Search extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, {}, null, [-1, -1, -1]);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Search",
				options,
				id: create_fragment$1.name
			});
		}
	}

	// Component
	// Anime

	var C = {
		Fixed: {
			FilterPopup: FilterPopup,
			Navigator: Navigator,
			Menu: Menu,
			Header: Header,
			Toast: Toast,
			Loader: Loader
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
			Header: Header
		}
	};

	/* src\App.svelte generated by Svelte v3.59.1 */

	const { console: console_1 } = globals;
	const file = "src\\App.svelte";

	function create_fragment(ctx) {
		let main;
		let c_fixed_navigator;
		let t0;
		let c_fixed_menu;
		let t1;
		let c_others_header;
		let t2;
		let div;
		let c_others_search;
		let t3;
		let c_anime_animegrid;
		let t4;
		let c_anime_fixed_animepopup;
		let t5;
		let c_fixed_filterpopup;
		let t6;
		let c_anime_fixed_animeoptionspopup;
		let t7;
		let c_fixed_toast;
		let t8;
		let c_fixed_loader;
		let current;
		c_fixed_navigator = new C.Fixed.Navigator({ $$inline: true });
		c_fixed_menu = new C.Fixed.Menu({ $$inline: true });
		c_others_header = new C.Others.Header({ $$inline: true });
		c_others_search = new C.Others.Search({ $$inline: true });
		c_anime_animegrid = new C.Anime.AnimeGrid({ $$inline: true });
		c_anime_fixed_animepopup = new C.Anime.Fixed.AnimePopup({ $$inline: true });
		c_fixed_filterpopup = new C.Fixed.FilterPopup({ $$inline: true });
		c_anime_fixed_animeoptionspopup = new C.Anime.Fixed.AnimeOptionsPopup({ $$inline: true });
		c_fixed_toast = new C.Fixed.Toast({ $$inline: true });
		c_fixed_loader = new C.Fixed.Loader({ $$inline: true });

		const block = {
			c: function create() {
				main = element("main");
				create_component(c_fixed_navigator.$$.fragment);
				t0 = space();
				create_component(c_fixed_menu.$$.fragment);
				t1 = space();
				create_component(c_others_header.$$.fragment);
				t2 = space();
				div = element("div");
				create_component(c_others_search.$$.fragment);
				t3 = space();
				create_component(c_anime_animegrid.$$.fragment);
				t4 = space();
				create_component(c_anime_fixed_animepopup.$$.fragment);
				t5 = space();
				create_component(c_fixed_filterpopup.$$.fragment);
				t6 = space();
				create_component(c_anime_fixed_animeoptionspopup.$$.fragment);
				t7 = space();
				create_component(c_fixed_toast.$$.fragment);
				t8 = space();
				create_component(c_fixed_loader.$$.fragment);
				attr_dev(div, "class", "home svelte-1v56w7v");
				add_location(div, file, 508, 1, 13963);
				attr_dev(main, "class", "svelte-1v56w7v");
				add_location(main, file, 503, 0, 13887);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, main, anchor);
				mount_component(c_fixed_navigator, main, null);
				append_dev(main, t0);
				mount_component(c_fixed_menu, main, null);
				append_dev(main, t1);
				mount_component(c_others_header, main, null);
				append_dev(main, t2);
				append_dev(main, div);
				mount_component(c_others_search, div, null);
				append_dev(div, t3);
				mount_component(c_anime_animegrid, div, null);
				append_dev(div, t4);
				mount_component(c_anime_fixed_animepopup, div, null);
				append_dev(main, t5);
				mount_component(c_fixed_filterpopup, main, null);
				append_dev(main, t6);
				mount_component(c_anime_fixed_animeoptionspopup, main, null);
				append_dev(main, t7);
				mount_component(c_fixed_toast, main, null);
				append_dev(main, t8);
				mount_component(c_fixed_loader, main, null);
				current = true;
			},
			p: noop,
			i: function intro(local) {
				if (current) return;
				transition_in(c_fixed_navigator.$$.fragment, local);
				transition_in(c_fixed_menu.$$.fragment, local);
				transition_in(c_others_header.$$.fragment, local);
				transition_in(c_others_search.$$.fragment, local);
				transition_in(c_anime_animegrid.$$.fragment, local);
				transition_in(c_anime_fixed_animepopup.$$.fragment, local);
				transition_in(c_fixed_filterpopup.$$.fragment, local);
				transition_in(c_anime_fixed_animeoptionspopup.$$.fragment, local);
				transition_in(c_fixed_toast.$$.fragment, local);
				transition_in(c_fixed_loader.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(c_fixed_navigator.$$.fragment, local);
				transition_out(c_fixed_menu.$$.fragment, local);
				transition_out(c_others_header.$$.fragment, local);
				transition_out(c_others_search.$$.fragment, local);
				transition_out(c_anime_animegrid.$$.fragment, local);
				transition_out(c_anime_fixed_animepopup.$$.fragment, local);
				transition_out(c_fixed_filterpopup.$$.fragment, local);
				transition_out(c_anime_fixed_animeoptionspopup.$$.fragment, local);
				transition_out(c_fixed_toast.$$.fragment, local);
				transition_out(c_fixed_loader.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) detach_dev(main);
				destroy_component(c_fixed_navigator);
				destroy_component(c_fixed_menu);
				destroy_component(c_others_header);
				destroy_component(c_others_search);
				destroy_component(c_anime_animegrid);
				destroy_component(c_anime_fixed_animepopup);
				destroy_component(c_fixed_filterpopup);
				destroy_component(c_anime_fixed_animeoptionspopup);
				destroy_component(c_fixed_toast);
				destroy_component(c_fixed_loader);
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

	function documentScroll(val) {

	} // if (val === true) {
	// 	currentScrollTop = document.documentElement.scrollTop;

	function instance($$self, $$props, $$invalidate) {
		let $android;
		let $shouldGoBack;
		let $popupVisible;
		let $menuVisible;
		let $animeOptionVisible;
		let $lastRunnedAutoExportDate;
		let $autoExportInterval;
		let $autoExport;
		let $lastRunnedAutoUpdateDate;
		let $autoUpdateInterval;
		let $autoUpdate;
		let $filterOptions;
		let $activeTagFilters;
		let $dataStatus;
		let $finalAnimeList;
		let $initData;
		let $searchedAnimeKeyword;
		let $animeLoaderWorker;
		let $username;
		let $hiddenEntries;
		let $autoPlay;
		let $lastAnimeUpdate;
		let $exportPathIsAvailable;
		validate_store(android, 'android');
		component_subscribe($$self, android, $$value => $$invalidate(4, $android = $$value));
		validate_store(shouldGoBack, 'shouldGoBack');
		component_subscribe($$self, shouldGoBack, $$value => $$invalidate(5, $shouldGoBack = $$value));
		validate_store(popupVisible, 'popupVisible');
		component_subscribe($$self, popupVisible, $$value => $$invalidate(6, $popupVisible = $$value));
		validate_store(menuVisible, 'menuVisible');
		component_subscribe($$self, menuVisible, $$value => $$invalidate(7, $menuVisible = $$value));
		validate_store(animeOptionVisible, 'animeOptionVisible');
		component_subscribe($$self, animeOptionVisible, $$value => $$invalidate(8, $animeOptionVisible = $$value));
		validate_store(lastRunnedAutoExportDate, 'lastRunnedAutoExportDate');
		component_subscribe($$self, lastRunnedAutoExportDate, $$value => $$invalidate(9, $lastRunnedAutoExportDate = $$value));
		validate_store(autoExportInterval, 'autoExportInterval');
		component_subscribe($$self, autoExportInterval, $$value => $$invalidate(10, $autoExportInterval = $$value));
		validate_store(autoExport, 'autoExport');
		component_subscribe($$self, autoExport, $$value => $$invalidate(11, $autoExport = $$value));
		validate_store(lastRunnedAutoUpdateDate, 'lastRunnedAutoUpdateDate');
		component_subscribe($$self, lastRunnedAutoUpdateDate, $$value => $$invalidate(12, $lastRunnedAutoUpdateDate = $$value));
		validate_store(autoUpdateInterval, 'autoUpdateInterval');
		component_subscribe($$self, autoUpdateInterval, $$value => $$invalidate(13, $autoUpdateInterval = $$value));
		validate_store(autoUpdate, 'autoUpdate');
		component_subscribe($$self, autoUpdate, $$value => $$invalidate(14, $autoUpdate = $$value));
		validate_store(filterOptions, 'filterOptions');
		component_subscribe($$self, filterOptions, $$value => $$invalidate(15, $filterOptions = $$value));
		validate_store(activeTagFilters, 'activeTagFilters');
		component_subscribe($$self, activeTagFilters, $$value => $$invalidate(16, $activeTagFilters = $$value));
		validate_store(dataStatus, 'dataStatus');
		component_subscribe($$self, dataStatus, $$value => $$invalidate(17, $dataStatus = $$value));
		validate_store(finalAnimeList, 'finalAnimeList');
		component_subscribe($$self, finalAnimeList, $$value => $$invalidate(18, $finalAnimeList = $$value));
		validate_store(initData, 'initData');
		component_subscribe($$self, initData, $$value => $$invalidate(19, $initData = $$value));
		validate_store(searchedAnimeKeyword, 'searchedAnimeKeyword');
		component_subscribe($$self, searchedAnimeKeyword, $$value => $$invalidate(20, $searchedAnimeKeyword = $$value));
		validate_store(animeLoaderWorker$1, 'animeLoaderWorker');
		component_subscribe($$self, animeLoaderWorker$1, $$value => $$invalidate(21, $animeLoaderWorker = $$value));
		validate_store(username, 'username');
		component_subscribe($$self, username, $$value => $$invalidate(22, $username = $$value));
		validate_store(hiddenEntries, 'hiddenEntries');
		component_subscribe($$self, hiddenEntries, $$value => $$invalidate(23, $hiddenEntries = $$value));
		validate_store(autoPlay, 'autoPlay');
		component_subscribe($$self, autoPlay, $$value => $$invalidate(24, $autoPlay = $$value));
		validate_store(lastAnimeUpdate, 'lastAnimeUpdate');
		component_subscribe($$self, lastAnimeUpdate, $$value => $$invalidate(25, $lastAnimeUpdate = $$value));
		validate_store(exportPathIsAvailable, 'exportPathIsAvailable');
		component_subscribe($$self, exportPathIsAvailable, $$value => $$invalidate(26, $exportPathIsAvailable = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('App', slots, []);
		set_store_value(android, $android = isAndroid(), $android);

		// Get Export Folder for Android
		(async () => {
			set_store_value(exportPathIsAvailable, $exportPathIsAvailable = await retrieveJSON("exportPathIsAvailable"), $exportPathIsAvailable);
		})();

		// For Youtube API
		const onYouTubeIframeAPIReady = new Function();

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

		// Check/Get/Update/Process Anime Entries
		initDataPromises.push(new Promise(async resolve => {
			let animeEntriesLen = await retrieveJSON("animeEntriesLength");
			let _lastAnimeUpdate = await retrieveJSON("lastAnimeUpdate");

			if (animeEntriesLen < 1 || !(_lastAnimeUpdate instanceof Date)) {
				set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList);

				getAnimeEntries().then(data => {
					set_store_value(lastAnimeUpdate, $lastAnimeUpdate = data.lastAnimeUpdate, $lastAnimeUpdate);
					resolve();
				}).catch(async error => {
					console.error(error);
					requestAnimeEntries();
					resolve();
				});
			} else {
				resolve();
			}
		}));

		// Check/Update/Process User Anime Entries
		initDataPromises.push(new Promise(async resolve => {
			let _username = await retrieveJSON("username");

			if (_username) {
				set_store_value(username, $username = _username, $username);
				requestUserEntries({ username: $username });
			}

			resolve();
		}));

		// Check/Get Anime Franchises
		initDataPromises.push(new Promise(async resolve => {
			let animeFranchisesLen = await retrieveJSON("animeFranchisesLength");

			if (animeFranchisesLen < 1) {
				getAnimeFranchises();
			}

			resolve();
		}));

		// Check/Get/Update Filter Options Selection
		initDataPromises.push(new Promise(async resolve => {
			let _filterOptions = await retrieveJSON("filterOptions");
			let _activeTagFilters = await retrieveJSON("activeTagFilters");

			if (jsonIsEmpty(_filterOptions) || jsonIsEmpty(_activeTagFilters)) {
				updateFilters.update(e => !e);
			} else {
				set_store_value(filterOptions, $filterOptions = _filterOptions, $filterOptions);
				set_store_value(activeTagFilters, $activeTagFilters = _activeTagFilters, $activeTagFilters);
			}

			resolve();
		}));

		// Get Existing Anime List
		initDataPromises.push(new Promise(async resolve => {
			let shouldProcessRecommendation = await retrieveJSON("shouldProcessRecommendation");
			let recommendedAnimeListLen = await retrieveJSON("recommendedAnimeListLength");

			if (!shouldProcessRecommendation && recommendedAnimeListLen?.length) {
				loadAnime.update(e => !e);
			} else {
				updateRecommendationList.update(e => !e);
			}

			resolve();
		}));

		// Get Existing Data If there are any
		initDataPromises.push(new Promise(async resolve => {
			// Auto Play
			let _autoPlay = await retrieveJSON("autoPlay");

			if (typeof _autoPlay === "boolean") set_store_value(autoPlay, $autoPlay = _autoPlay, $autoPlay);

			// Hidden Entries
			set_store_value(hiddenEntries, $hiddenEntries = await retrieveJSON("hiddenEntries") || {}, $hiddenEntries);

			// Get Auto Functions
			set_store_value(lastRunnedAutoUpdateDate, $lastRunnedAutoUpdateDate = await retrieveJSON("lastRunnedAutoUpdateDate"), $lastRunnedAutoUpdateDate);

			set_store_value(lastRunnedAutoExportDate, $lastRunnedAutoExportDate = await retrieveJSON("lastRunnedAutoExportDate"), $lastRunnedAutoExportDate);

			// Should be After Getting the Dates for Reactive Change
			set_store_value(autoUpdate, $autoUpdate = await retrieveJSON("autoUpdate") ?? false, $autoUpdate);

			set_store_value(autoExport, $autoExport = await retrieveJSON("autoExport") ?? false, $autoExport);
			resolve();
		}));

		Promise.all(initDataPromises).then(async () => {
			set_store_value(initData, $initData = false, $initData);
			clearInterval(pleaseWaitStatusInterval);

			if (!$username) {
				let usernameInput = document.getElementById("usernameInput");
				usernameInput.setCustomValidity("Enter your Anilist Username");
				usernameInput.reportValidity();
			}

			// Double Check
			let recommendedAnimeListLen = await retrieveJSON("recommendedAnimeListLength");

			if (recommendedAnimeListLen < 1) {
				updateRecommendationList.update(e => !e);
			} else if (!$finalAnimeList?.length) {
				loadAnime.update(e => !e);
			}
		}).catch(error => {
			set_store_value(initData, $initData = false, $initData);
			clearInterval(pleaseWaitStatusInterval);
			set_store_value(dataStatus, $dataStatus = "Something went wrong...", $dataStatus);
			console.error(error);
		});

		// Reactive Functions
		updateRecommendationList.subscribe(async val => {
			if (typeof val !== "boolean") return;
			await saveJSON(true, "shouldProcessRecommendation");

			processRecommendedAnimeList().then(async () => {
				await saveJSON(false, "shouldProcessRecommendation");
				loadAnime.update(e => !e);
			}).catch(error => {
				throw error;
			});
		});

		loadAnime.subscribe(async val => {
			if (typeof val !== "boolean") return;

			animeLoader().then(async data => {
				set_store_value(animeLoaderWorker$1, $animeLoaderWorker = data.animeLoaderWorker, $animeLoaderWorker);
				set_store_value(searchedAnimeKeyword, $searchedAnimeKeyword = "", $searchedAnimeKeyword);

				if ($initData) {
					set_store_value(finalAnimeList, $finalAnimeList = null, $finalAnimeList); // Loading
				} else {
					set_store_value(finalAnimeList, $finalAnimeList = data.finalAnimeList, $finalAnimeList);
				}

				set_store_value(dataStatus, $dataStatus = null, $dataStatus);
				return;
			}).catch(error => {
				throw error;
			});
		});

		updateFilters.subscribe(async val => {
			if (typeof val !== "boolean") return;

			getFilterOptions().then(data => {
				set_store_value(activeTagFilters, $activeTagFilters = data.activeTagFilters, $activeTagFilters);
				set_store_value(filterOptions, $filterOptions = data.filterOptions, $filterOptions);
			});
		});

		autoUpdate.subscribe(async val => {
			if (typeof val !== "boolean") return; else if (val === true) {
				saveJSON(true, "autoUpdate");

				// Check Run First
				let isPastDate = false;

				if ($lastRunnedAutoUpdateDate === null) isPastDate = true; else if ($lastRunnedAutoUpdateDate instanceof Date && !isNaN($lastRunnedAutoUpdateDate)) {
					if (new Date().getTime() - $lastRunnedAutoUpdateDate.getTime() > 3600000) {
						isPastDate = true;
					}
				}

				if (isPastDate) {
					runUpdate.update(e => !e);
					if ($autoUpdateInterval) clearInterval($autoUpdateInterval);

					set_store_value(
						autoUpdateInterval,
						$autoUpdateInterval = setInterval(
							() => {
								if ($autoUpdate) {
									runUpdate.update(e => !e);
								}
							},
							3600000
						),
						$autoUpdateInterval
					);
				} else {
					let timeLeft = 3600000 - (new Date().getTime() - $lastRunnedAutoUpdateDate?.getTime()) || 0;

					setTimeout(
						() => {
							if ($autoUpdate === false) return;
							runUpdate.update(e => !e);
							if ($autoUpdateInterval) clearInterval($autoUpdateInterval);

							set_store_value(
								autoUpdateInterval,
								$autoUpdateInterval = setInterval(
									() => {
										if ($autoUpdate) {
											runUpdate.update(e => !e);
										}
									},
									3600000
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

		runUpdate.subscribe(val => {
			if (typeof val !== "boolean") return;
			set_store_value(lastRunnedAutoUpdateDate, $lastRunnedAutoUpdateDate = new Date(), $lastRunnedAutoUpdateDate);
			saveJSON($lastRunnedAutoUpdateDate, "lastRunnedAutoUpdateDate");

			requestUserEntries().then(() => {
				requestAnimeEntries();
			}).catch(error => {
				console.error(error);
			});
		});

		autoExport.subscribe(async val => {
			if (typeof val !== "boolean") return; else if (val === true) {
				saveJSON(true, "autoExport");

				// Check Run First
				let isPastDate = false;

				if ($lastRunnedAutoExportDate === null) isPastDate = true; else if ($lastRunnedAutoExportDate instanceof Date && !isNaN($lastRunnedAutoExportDate)) {
					if (new Date().getTime() - $lastRunnedAutoExportDate.getTime() > 3600000) {
						isPastDate = true;
					}
				}

				if (isPastDate) {
					runExport.update(e => !e);
					if ($autoExportInterval) clearInterval($autoExportInterval);

					set_store_value(
						autoExportInterval,
						$autoExportInterval = setInterval(
							() => {
								if ($autoExport) {
									runExport.update(e => !e);
								}
							},
							3600000
						),
						$autoExportInterval
					);
				} else {
					let timeLeft = 3600000 - (new Date().getTime() - $lastRunnedAutoExportDate?.getTime()) || 0;

					setTimeout(
						() => {
							if ($autoExport === false) return;
							runExport.update(e => !e);
							if ($autoExportInterval) clearInterval($autoExportInterval);

							set_store_value(
								autoExportInterval,
								$autoExportInterval = setInterval(
									() => {
										if ($autoExport) {
											runExport.update(e => !e);
										}
									},
									3600000
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

		runExport.subscribe(() => {
			if (typeof val !== "boolean") return;
			set_store_value(lastRunnedAutoExportDate, $lastRunnedAutoExportDate = new Date(), $lastRunnedAutoExportDate);
			saveJSON($lastRunnedAutoExportDate, "lastRunnedAutoExportDate");
			exportUserData();
		});

		let currentScrollTop;

		popupVisible.subscribe(val => {
		});

		menuVisible.subscribe(val => {
		});

		animeOptionVisible.subscribe(val => {
		});

		// 	document.documentElement.classList.add("noscroll");
		// 	document.body.classList.add("noscroll");
		// 	document.body.style.top = -currentScrollTop + "px";
		// } else if (val === false) {
		// 	document.documentElement.classList.remove("noscroll");
		// 	document.body.classList.remove("noscroll");
		// 	document.body.style.top = "";
		// 	document.documentElement.scrollTop = currentScrollTop;
		// }
		// Global Function For Android/Browser
		if ("scrollRestoration" in window.history) {
			window.history.scrollRestoration = "manual"; // Disable scrolling to top when navigating back
		}

		window.addEventListener("popstate", () => {
			window.backPressed();
		});

		window.backPressed = () => {
			if ($shouldGoBack && !$android) {
				window.history.go(-1); // Only in Browser
			} else {
				if (!$android) {
					window.history.pushState("visited", ""); // Push Popped State
				}

				if ($animeOptionVisible) {
					set_store_value(animeOptionVisible, $animeOptionVisible = false, $animeOptionVisible);
					return;
				} else if ($menuVisible) {
					set_store_value(menuVisible, $menuVisible = false, $menuVisible);
					return;
				} else if ($popupVisible) {
					set_store_value(popupVisible, $popupVisible = false, $popupVisible);
					return;
				} else if (window.scrollY > 200) {
					window.scrollTo({ top: 0, behavior: "smooth" });
					return;
				} else {
					window.setShoulGoBack(true);
				}
			}
		};

		popupVisible.subscribe(val => {
			if (typeof val !== "boolean") return;
			if (val === true) window.setShoulGoBack(false);
		});

		menuVisible.subscribe(val => {
			if (typeof val !== "boolean") return;
			if (val === true) window.setShoulGoBack(false);
		});

		let isScrolling, scrollingTimeout;

		window.addEventListener("scroll", () => {
			if (window.scrollY !== 0) window.setShoulGoBack(false);
			if (!isScrolling) isScrolling = true;
			if (scrollingTimeout) clearTimeout(scrollingTimeout);

			scrollingTimeout = setTimeout(
				() => {
					isScrolling = false;
				},
				1000
			);
		});

		onMount(() => {
			document.getElementById("popup-container").addEventListener("scroll", () => {
				if (!isScrolling) isScrolling = true;
				if (scrollingTimeout) clearTimeout(scrollingTimeout);

				scrollingTimeout = setTimeout(
					() => {
						isScrolling = false;
					},
					1000
				);
			});
		});

		window.setShoulGoBack = _shouldGoBack => {
			if ($android) {
				try {
					JSBridge.setShoulGoBack(_shouldGoBack);
				} catch (e) {

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
				} catch (e) {

				}
			} else {
				navigator?.clipboard?.writeText?.(text);
			}
		};

		let copytimeoutId;
		let copyhold = false;

		document.addEventListener("pointerdown", e => {
			let target = e.target;
			let classList = target.classList;
			if (!classList.contains("copy")) target = target.closest(".copy");

			if (target) {
				e.preventDefault();
				copyhold = true;
				if (copytimeoutId) clearTimeout(copytimeoutId);

				copytimeoutId = setTimeout(
					() => {
						let text = target.getAttribute("copy-value");

						if (text && !isScrolling && copyhold) {
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
			let target = e.target;
			let classList = target.classList;
			if (!classList.contains("copy")) target = target.closest(".copy");

			if (target) {
				copyhold = false;
				if (copytimeoutId) clearTimeout(copytimeoutId);
			}
		});

		document.addEventListener("pointercancel", e => {
			let target = e.target;
			let classList = target.classList;
			if (!classList.contains("copy")) target = target.closest(".copy");

			if (target) {
				copyhold = false;
				if (copytimeoutId) clearTimeout(copytimeoutId);
			}
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({
			C,
			onMount,
			onDestroy,
			IDBinit,
			retrieveJSON,
			saveJSON,
			android,
			lastAnimeUpdate,
			username,
			hiddenEntries,
			filterOptions,
			activeTagFilters,
			finalAnimeList,
			animeLoaderWorker: animeLoaderWorker$1,
			initData,
			searchedAnimeKeyword,
			dataStatus,
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
			runUpdate,
			runExport,
			updateRecommendationList,
			loadAnime,
			updateFilters,
			animeOptionVisible,
			getAnimeEntries,
			getFilterOptions,
			getAnimeFranchises,
			requestAnimeEntries,
			requestUserEntries,
			processRecommendedAnimeList,
			animeLoader,
			exportUserData,
			isAndroid,
			isJsonObject,
			jsonIsEmpty,
			onYouTubeIframeAPIReady,
			initDataPromises,
			pleaseWaitStatusInterval,
			currentScrollTop,
			documentScroll,
			isScrolling,
			scrollingTimeout,
			copytimeoutId,
			copyhold,
			$android,
			$shouldGoBack,
			$popupVisible,
			$menuVisible,
			$animeOptionVisible,
			$lastRunnedAutoExportDate,
			$autoExportInterval,
			$autoExport,
			$lastRunnedAutoUpdateDate,
			$autoUpdateInterval,
			$autoUpdate,
			$filterOptions,
			$activeTagFilters,
			$dataStatus,
			$finalAnimeList,
			$initData,
			$searchedAnimeKeyword,
			$animeLoaderWorker,
			$username,
			$hiddenEntries,
			$autoPlay,
			$lastAnimeUpdate,
			$exportPathIsAvailable
		});

		$$self.$inject_state = $$props => {
			if ('initDataPromises' in $$props) initDataPromises = $$props.initDataPromises;
			if ('pleaseWaitStatusInterval' in $$props) pleaseWaitStatusInterval = $$props.pleaseWaitStatusInterval;
			if ('currentScrollTop' in $$props) currentScrollTop = $$props.currentScrollTop;
			if ('isScrolling' in $$props) isScrolling = $$props.isScrolling;
			if ('scrollingTimeout' in $$props) scrollingTimeout = $$props.scrollingTimeout;
			if ('copytimeoutId' in $$props) copytimeoutId = $$props.copytimeoutId;
			if ('copyhold' in $$props) copyhold = $$props.copyhold;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [];
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment.name
			});
		}
	}

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	window.FontAwesomeKitConfig = { asyncLoading: { enabled: !1 }, autoA11y: { enabled: !0 }, baseUrl: "https://ka-f.fontawesome.com", baseUrlKit: "https://kit.fontawesome.com", detectConflictsUntil: null, iconUploads: {}, id: 76794169, license: "free", method: "css", minify: { enabled: !0 }, token: "5a5fa257cb", v4FontFaceShim: { enabled: !0 }, v4shim: { enabled: !0 }, v5FontFaceShim: { enabled: !0 }, version: "6.2.0" }, function (t) { t(); }(function () { function r(t) { return (r = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (t) { return typeof t } : function (t) { return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t })(t) } function e(e, t) { var n, o = Object.keys(e); return Object.getOwnPropertySymbols && (n = Object.getOwnPropertySymbols(e), t && (n = n.filter(function (t) { return Object.getOwnPropertyDescriptor(e, t).enumerable })), o.push.apply(o, n)), o } function u(o) { for (var t = 1; t < arguments.length; t++) { var r = null != arguments[t] ? arguments[t] : {}; t % 2 ? e(Object(r), !0).forEach(function (t) { var e, n; e = o, n = r[t = t], t in e ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = n; }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(o, Object.getOwnPropertyDescriptors(r)) : e(Object(r)).forEach(function (t) { Object.defineProperty(o, t, Object.getOwnPropertyDescriptor(r, t)); }); } return o } function i(t, e) { (null == e || e > t.length) && (e = t.length); for (var n = 0, o = new Array(e); n < e; n++)o[n] = t[n]; return o } function o(t, e) { var n = e && e.addOn || "", n = e && e.baseFilename || t.license + n, o = e && e.minify ? ".min" : "", r = e && e.fileSuffix || t.method, e = e && e.subdir || t.method; return t.baseUrl + "/releases/" + ("latest" === t.version ? "latest" : "v".concat(t.version)) + "/" + e + "/" + n + o + "." + r } function s(o, t) { t = "." + Array.prototype.join.call(t || ["fa"], ",."), t = o.querySelectorAll(t); Array.prototype.forEach.call(t, function (t) { var e = t.getAttribute("title"), n = (t.setAttribute("aria-hidden", "true"), !t.nextElementSibling || !t.nextElementSibling.classList.contains("sr-only")); e && n && ((n = o.createElement("span")).innerHTML = e, n.classList.add("sr-only"), t.parentNode.insertBefore(n, t.nextSibling)); }); } function c() { } var n, a = "undefined" != typeof commonjsGlobal && void 0 !== commonjsGlobal.process && "function" == typeof commonjsGlobal.process.emit, f = "undefined" == typeof setImmediate ? setTimeout : setImmediate, d = []; function l() { for (var t = 0; t < d.length; t++)d[t][0](d[t][1]); n = !(d = []); } function h(t, e) { d.push([t, e]), n || (n = !0, f(l, 0)); } function m(t) { var e = t.owner, n = e._state, e = e._data, o = t[n], r = t.then; if ("function" == typeof o) { n = "fulfilled"; try { e = o(e); } catch (t) { v(r, t); } } p(r, e) || ("fulfilled" === n && b(r, e), "rejected" === n && v(r, e)); } function p(e, n) { var o; try { if (e === n) throw new TypeError("A promises callback cannot return that same promise."); if (n && ("function" == typeof n || "object" === r(n))) { var t = n.then; if ("function" == typeof t) return t.call(n, function (t) { o || (o = !0, (n === t ? y : b)(e, t)); }, function (t) { o || (o = !0, v(e, t)); }), 1 } } catch (t) { return o || v(e, t), 1 } } function b(t, e) { t !== e && p(t, e) || y(t, e); } function y(t, e) { "pending" === t._state && (t._state = "settled", t._data = e, h(w, t)); } function v(t, e) { "pending" === t._state && (t._state = "settled", t._data = e, h(A, t)); } function g(t) { t._then = t._then.forEach(m); } function w(t) { t._state = "fulfilled", g(t); } function A(t) { t._state = "rejected", g(t), !t._handled && a && commonjsGlobal.process.emit("unhandledRejection", t._data, t); } function S(t) { commonjsGlobal.process.emit("rejectionHandled", t); } function O(t) { if ("function" != typeof t) throw new TypeError("Promise resolver " + t + " is not a function"); if (this instanceof O == 0) throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function."); this._then = []; var e = t, n = this; function o(t) { v(n, t); } try { e(function (t) { b(n, t); }, o); } catch (e) { o(e); } } O.prototype = { constructor: O, _state: "pending", _then: null, _data: void 0, _handled: !1, then: function (t, e) { var n = { owner: this, then: new this.constructor(c), fulfilled: t, rejected: e }; return !e && !t || this._handled || (this._handled = !0, "rejected" === this._state && a && h(S, this)), "fulfilled" === this._state || "rejected" === this._state ? h(m, n) : this._then.push(n), n.then }, catch: function (t) { return this.then(null, t) } }, O.all = function (c) { if (Array.isArray(c)) return new O(function (n, t) { var o = [], r = 0; for (var e, i = 0; i < c.length; i++)(e = c[i]) && "function" == typeof e.then ? e.then(function (e) { return r++, function (t) { o[e] = t, --r || n(o); } }(i), t) : o[i] = e; r || n(o); }); throw new TypeError("You must pass an array to Promise.all().") }, O.race = function (r) { if (Array.isArray(r)) return new O(function (t, e) { for (var n, o = 0; o < r.length; o++)(n = r[o]) && "function" == typeof n.then ? n.then(t, e) : t(n); }); throw new TypeError("You must pass an array to Promise.race().") }, O.resolve = function (e) { return e && "object" === r(e) && e.constructor === O ? e : new O(function (t) { t(e); }) }, O.reject = function (n) { return new O(function (t, e) { e(n); }) }; var j, F, E, _, C = "function" == typeof Promise ? Promise : O; function P(t, e) { var r = e.fetch, i = e.XMLHttpRequest, e = e.token, c = t; return "URLSearchParams" in window ? (c = new URL(t)).searchParams.set("token", e) : c = c + "?token=" + encodeURIComponent(e), c = c.toString(), new C(function (e, n) { var o; "function" == typeof r ? r(c, { mode: "cors", cache: "default" }).then(function (t) { if (t.ok) return t.text(); throw new Error("") }).then(function (t) { e(t); }).catch(n) : "function" == typeof i ? ((o = new i).addEventListener("loadend", function () { this.responseText ? e(this.responseText) : n(new Error("")); }), ["abort", "error", "timeout"].map(function (t) { o.addEventListener(t, function () { n(new Error("")); }); }), o.open("GET", c), o.send()) : n(new Error("")); }) } function U(t, n, o) { var r = t; return [[/(url\("?)\.\.\/\.\.\/\.\./g, function (t, e) { return "".concat(e).concat(n) }], [/(url\("?)\.\.\/webfonts/g, function (t, e) { return "".concat(e).concat(n, "/releases/v").concat(o, "/webfonts") }], [/(url\("?)https:\/\/kit-free([^.])*\.fontawesome\.com/g, function (t, e) { return "".concat(e).concat(n) }]].forEach(function (t) { e = 2; var t = function (t) { if (Array.isArray(t)) return t }(t = t) || function (t, e) { if ("undefined" != typeof Symbol && Symbol.iterator in Object(t)) { var n = [], o = !0, r = !1, i = void 0; try { for (var c, a = t[Symbol.iterator](); !(o = (c = a.next()).done) && (n.push(c.value), !e || n.length !== e); o = !0); } catch (t) { r = !0, i = t; } finally { try { o || null == a.return || a.return(); } finally { if (r) throw i } } return n } }(t, e) || function (t, e) { var n; if (t) return "string" == typeof t ? i(t, e) : "Map" === (n = "Object" === (n = Object.prototype.toString.call(t).slice(8, -1)) && t.constructor ? t.constructor.name : n) || "Set" === n ? Array.from(t) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? i(t, e) : void 0 }(t, e) || function () { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.") }(), e = t[0], t = t[1]; r = r.replace(e, t); }), r } function k(c, a, t) { var t = 2 < arguments.length && void 0 !== t ? t : function () { }, e = a.document || e, e = s.bind(s, e, ["fa", "fab", "fas", "far", "fal", "fad", "fak"]), n = 0 < Object.keys(c.iconUploads || {}).length, t = (c.autoA11y.enabled && t(e), [{ id: "fa-main", addOn: void 0 }]), e = (c.v4shim && c.v4shim.enabled && t.push({ id: "fa-v4-shims", addOn: "-v4-shims" }), c.v5FontFaceShim && c.v5FontFaceShim.enabled && t.push({ id: "fa-v5-font-face", addOn: "-v5-font-face" }), c.v4FontFaceShim && c.v4FontFaceShim.enabled && t.push({ id: "fa-v4-font-face", addOn: "-v4-font-face" }), n && t.push({ id: "fa-kit-upload", customCss: !0 }), t.map(function (i) { return new C(function (r, t) { P(i.customCss ? c.baseUrlKit + "/" + c.token + "/" + c.id + "/kit-upload.css" : o(c, { addOn: i.addOn, minify: c.minify.enabled }), a).then(function (t) { var e, n, o; r((t = t, e = u(u({}, a), {}, { baseUrl: c.baseUrl, version: c.version, id: i.id, contentFilter: function (t, e) { return U(t, e.baseUrl, e.version) } }), n = e.contentFilter || function (t, e) { return t }, o = document.createElement("style"), n = document.createTextNode(n(t, e)), o.appendChild(n), o.media = "all", e.id && o.setAttribute("id", e.id), e && e.detectingConflicts && e.detectionIgnoreAttr && o.setAttributeNode(document.createAttribute(e.detectionIgnoreAttr)), o)); }).catch(t); }) })); return C.all(e) } function L(n, i) { i.autoA11y = n.autoA11y.enabled, "pro" === n.license && (i.autoFetchSvg = !0, i.fetchSvgFrom = n.baseUrl + "/releases/" + ("latest" === n.version ? "latest" : "v".concat(n.version)) + "/svgs", i.fetchUploadedSvgFrom = n.uploadsUrl); var t = []; return n.v4shim.enabled && t.push(new C(function (e, t) { P(o(n, { addOn: "-v4-shims", minify: n.minify.enabled }), i).then(function (t) { e(I(t, u(u({}, i), {}, { id: "fa-v4-shims" }))); }).catch(t); })), t.push(new C(function (r, t) { P(o(n, { minify: n.minify.enabled }), i).then(function (t) { var e, n, o, t = I(t, u(u({}, i), {}, { id: "fa-main" })); r((t = t, n = (e = i) && void 0 !== e.autoFetchSvg ? e.autoFetchSvg : void 0, void 0 !== (o = e && void 0 !== e.autoA11y ? e.autoA11y : void 0) && t.setAttribute("data-auto-a11y", o ? "true" : "false"), n && (t.setAttributeNode(document.createAttribute("data-auto-fetch-svg")), t.setAttribute("data-fetch-svg-from", e.fetchSvgFrom), t.setAttribute("data-fetch-uploaded-svg-from", e.fetchUploadedSvgFrom)), t)); }).catch(t); })), C.all(t) } function I(t, e) { var n = document.createElement("SCRIPT"), t = document.createTextNode(t); return n.appendChild(t), n.referrerPolicy = "strict-origin", e.id && n.setAttribute("id", e.id), e && e.detectingConflicts && e.detectionIgnoreAttr && n.setAttributeNode(document.createAttribute(e.detectionIgnoreAttr)), n } function T(t) { var e, n = [], o = document, r = (o.documentElement.doScroll ? /^loaded|^c/ : /^loaded|^i|^c/).test(o.readyState); r || o.addEventListener("DOMContentLoaded", e = function () { for (o.removeEventListener("DOMContentLoaded", e), r = 1; e = n.shift();)e(); }), r ? setTimeout(t, 0) : n.push(t); } try { window.FontAwesomeKitConfig && (j = window.FontAwesomeKitConfig, F = { detectingConflicts: j.detectConflictsUntil && new Date <= new Date(j.detectConflictsUntil), detectionIgnoreAttr: "data-fa-detection-ignore", fetch: window.fetch, token: j.token, XMLHttpRequest: window.XMLHttpRequest, document: document }, E = document.currentScript, _ = E ? E.parentElement : document.head, function (t, e) { t = 0 < arguments.length && void 0 !== t ? t : {}, e = 1 < arguments.length && void 0 !== e ? e : {}; return "js" === t.method ? L(t, e) : "css" === t.method ? k(t, e, function (t) { T(t), t = t, "undefined" != typeof MutationObserver && new MutationObserver(t).observe(document, { childList: !0, subtree: !0 }); }) : void 0 }(j, F).then(function (t) { t.map(function (e) { try { _.insertBefore(e, E ? E.nextSibling : null); } catch (t) { _.appendChild(e); } }), F.detectingConflicts && E && T(function () { E.setAttributeNode(document.createAttribute(F.detectionIgnoreAttr)); t = j, n = F, e = document.createElement("script"), n.detectionIgnoreAttr && e.setAttributeNode(document.createAttribute(n.detectionIgnoreAttr)), e.src = o(t, { baseFilename: "conflict-detection", fileSuffix: "js", subdir: "js", minify: t.minify.enabled }); var t, e, n = e; document.body.appendChild(n); }); }).catch(function (t) { console.error("".concat("Font Awesome Kit:", " ").concat(t)); })); } catch (r) { console.error("".concat("Font Awesome Kit:", " ").concat(r)); } });

	const app = new App({
		target: document.body
	});

	return app;

})();
//# sourceMappingURL=bundle.js.map
