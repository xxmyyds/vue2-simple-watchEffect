import type { WatchEffect } from './reactive'
import { isObject } from './utils'

let activeEffect: ReactiveEffect | undefined
let shouldTrack: boolean | undefined

type Dep = Set<ReactiveEffect>
type KeyToDepMap = Map<any, Dep>
interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

class ReactiveEffect<T = any> {
  private _fn: WatchEffect<T>
  public deps: Dep[] = []
  public active = true

  constructor(fn: WatchEffect<T>) {
    this._fn = fn
  }

  run() {
    if (!this.active)
      return this._fn()

    shouldTrack = true
    activeEffect = this
    const result = this._fn()
    shouldTrack = false

    return result
  }

  stop() {
    if (this.active) {
      cleanupEffect(this)
      this.active = false
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  effect.deps.forEach((dep: Dep) => {
    dep.delete(effect)
  })

  effect.deps.length = 0
}

const targetMap = new Map<any, KeyToDepMap>()

function isTracking() {
  return shouldTrack && activeEffect !== undefined
}

export function track(target: object, key: string) {
  if (!isTracking()) return

  let depsMap = targetMap.get(target)

  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  trackEffects(dep)
}

export function trigger(target: object, key: string) {
  if (isTracking()) return

  const depsMap = targetMap.get(target)
  if (!depsMap)
    return

  const dep = depsMap.get(key)
  if (isObject(dep))
    triggerEffects(dep)
}

export function effect<T = any>(fn: WatchEffect<T>): ReactiveEffectRunner {
  const _effect = new ReactiveEffect(fn)
  _effect.run()

  const runner: ReactiveEffectRunner = _effect.run.bind(_effect)

  runner.effect = _effect

  return runner
}

export function stop(runner: ReactiveEffectRunner) {
  runner.effect.stop()
}

function trackEffects(dep: Dep) {
  if (dep.has(activeEffect)) return
  dep.add(activeEffect)
  activeEffect?.deps.push(dep)
}

function triggerEffects(dep: Dep) {
  for (const effect of dep)
    effect.run()
}
