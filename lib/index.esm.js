const isObject = (value) => {
    return value !== null && typeof value === 'object';
};

let activeEffect;
let shouldTrack;
class ReactiveEffect {
    constructor(fn) {
        this.deps = [];
        this.active = true;
        this._fn = fn;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        const result = this._fn();
        shouldTrack = false;
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
const targetMap = new Map();
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trigger(target, key) {
    if (isTracking())
        return;
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        return;
    }
    const dep = depsMap.get(key);
    if (isObject(dep)) {
        triggerEffects(dep);
    }
}
function effect(fn) {
    const _effect = new ReactiveEffect(fn);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}
function stop(runner) {
    runner.effect.stop();
}
function trackEffects(dep) {
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect === null || activeEffect === void 0 ? void 0 : activeEffect.deps.push(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        effect.run();
    }
}

const get = createGetter();
const set = createSetter();
const handler = {
    get,
    set,
};
let currentInstance;
function createGetter() {
    return function get(target, key) {
        const res = Reflect.get(target, key);
        track(target, key);
        if (isObject(res)) {
            return createActiveObject(res, handler);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
function watchEffect(fn, vm) {
    currentInstance = vm;
    vm._data && initData(vm._data);
    vm._props && initProps(vm._props);
    return effect(fn);
}
function createActiveObject(target, handler) {
    if (!isObject(target)) {
        console.warn(`target ${target} must be a object`);
        return target;
    }
    return new Proxy(target, handler);
}
function initData(target) {
    currentInstance._data = createActiveObject(target, handler);
}
function initProps(target) {
    currentInstance._props = createActiveObject(target, handler);
}

export { stop, watchEffect };
