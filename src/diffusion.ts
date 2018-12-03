import {Range, Func, convertRange} from './lib/math'
import * as ORTH from './lib/ortho'
import * as Math from 'mathjs'

export interface parameter {
  dt: number
  dx: number
  N:  number
}

export interface IDiffusionEqSolver
{
  finit: Func
  fbound: Func
  xrange: Range

  initialCondition?: Func
  boundaryCondition?: Func

  reset(): void
  solution(x: number, t?: number): number
}

export class Diffusion implements IDiffusionEqSolver
{
  dt: number
  dx: number
  N:  number
  ar: Array<number>
  ar_calc: Array<number>
  t: number = 0

  xrange: Range

  finit:  Func
  fbound: Func

  public constructor(p: parameter, finit: Func, fbound: Func, xrange: Range) {
    if (p.dt / (p.dx*p.dx) >= 0.5)
    {
      console.log("dt / dx^2 >= 0.5")
    }
    this.dx = p.dx
    this.dt = p.dt
    this.N = p.N
    this.ar = new Array(p.N)
    this.ar_calc = new Array(p.N)

    this.finit = finit
    this.fbound = fbound
    this.xrange = xrange

    this.reset()
  }

  public reset()
  {
    this.setInitialValue()
    this.setBoundary()
  }

  public calc(dt?: number)
  {
    let delta
    if (dt === undefined)
    {
      delta = this.dt
    } else {
      delta = dt
    }

    this.setBoundary()
    for (let i = 1; i < this.N - 1; i++) {
      this.ar_calc[i] = this.nextValue(i, delta)
    }

    let tmp = this.ar
    this.ar = this.ar_calc
    this.ar_calc = tmp

    this.t += delta
  }

  public set initialCondition(f: Func) {
    this.finit = f
  }

  public set boundaryCondition(f: Func) {
    this.fbound = f
  }

  public solution(x: number): number
  {
    let irange = new Range(0, this.ar.length-1)
    let newx = Math.floor(convertRange(x, this.xrange, irange))
    return this.ar[newx]
  }

  private nextValue(i: number, dt: number): number
  {
    let a = dt / (this.dx*this.dx)
    let val = this.ar[i] + a * (this.ar[i+1] + this.ar[i-1] - 2*this.ar[i])
    return val
  }

  private setInitialValue() {
    for (let i=0; i < this.ar.length; i++)
    {
      this.ar[i] = this.finit(i)
    }
    this.t = 0
  }

  private setBoundary() {
    this.ar[0] = this.fbound(0)
    this.ar[this.ar.length-1] = this.fbound(this.ar.length-1)
    this.ar_calc[0] = this.ar[0]
    this.ar_calc[this.ar.length-1] = this.ar[this.ar.length-1]
  }

}

export class DiffusionEqSol implements IDiffusionEqSolver
{
  finit: Func;
  fbound: Func;
  am: Array<number>
  xrange: Range
  degree: number
  integrateNx: number
  fourer: ORTH.FourierOdd = new ORTH.FourierOdd

  constructor(initF: Func, xrange: Range, degree: number, integrateNx: number)
  {
    this.am = new Array<number>(integrateNx)
    this.finit = initF
    this.fbound = (x)=>x
    this.degree = degree
    this.integrateNx = integrateNx

    this.xrange = new Range(-xrange.r1, xrange.r1)

    this.setInitialValue()
  }

  reset(): void {
    this.setInitialValue()
  }

  public set initialCondition(f: Func) {
    let fodd = (x: number) => -f(-x)
    let threshold = 0.5 * this.xrange.length + this.xrange.r0
    this.finit = (x: number) =>
    {
      let fexpanded = (x<threshold)? fodd:f
      return fexpanded(x)
    }
  }

  setInitialValue()
  {
    this.am = ORTH.coeff(
      (x) => this.finit(convertRange(x, this.fourer.xrange, this.xrange)),
      this.fourer, this.degree, this.integrateNx)
  }

  // [0, 1]の場合のsin(n pi x)のnとずれることに注意!!!
  // -> 区間(xrange)を拡張したので問題ない
  T(n: number, t: number) : number
  {
    let a = (n*Math.pi)
    return Math.exp(- a*a * t)
  }

  soln(n: number, x: number, t: number)
  {
    return this.am[n] * this.T(n, t) * this.fourer.P(n, x)
  }

  public solution(x: number, t: number)
  {
    let res = 0
    for (var i = 1; i < this.am.length; i++) {
      res += this.soln(i, convertRange(x, this.xrange, this.fourer.xrange), t)
    }
    return res
  }
}