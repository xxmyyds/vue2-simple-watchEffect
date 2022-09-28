import { effect, track, trigger } from './effect'
import { isObject } from './utils'

const get = createGetter()
const set = createSetter()

const handler = {
  get,
  set,
}

let currentInstance: any

function createGetter() {
  return function get(target: object, key: string) {
    const res = Reflect.get(target, key)

    track(target, key)

    if (isObject(res)) {
      return createActiveObject(res, handler)
    }
    return res
  }
}

function createSetter() {
  return function set(target: object, key: string, value: unknown): boolean {
    const res = Reflect.set(target, key, value)
    trigger(target, key)

    return res
  }
}

export type WatchStopHandler = () => void
export type WatchEffect<T> = () => T

export function watchEffect<T = any>(
  fn: WatchEffect<T>,
  vm: any
): WatchStopHandler {
  currentInstance = vm

  vm._data && initData(vm._data)
  vm._props && initProps(vm._props)
  return effect(fn)
}

function createActiveObject(target: object, handler: ProxyHandler<any>) {
  if (!isObject(target)) {
    console.warn(`target ${target} must be a object`)
    return target
  }

  return new Proxy(target, handler)
}
function initData(target: object) {
  currentInstance._data = createActiveObject(target, handler)
}

function initProps(target: object) {
  currentInstance._props = createActiveObject(target, handler)
}
