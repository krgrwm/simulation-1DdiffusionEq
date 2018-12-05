import {Func, Range, convertRange} from './lib/math'
import * as App from './lib/PixiPlot'
import * as DAT from 'dat.gui'
import * as Math from 'mathjs'
import * as Diff from './diffusion'
import {at} from './lib/array'

// マウスドラッグとその軌跡を管理するクラス
class MouseTrack
{
  ys: Array<number>

  public constructor(N: number)
  {
    this.ys = new Array<number>(N)
    this.ys.fill(0)
  }

  public add(i: number, y: number)
  {
    for (let K = 0; K < this.ys.length / 60.0; K++) {
      K = Math.floor(K)
      at(this.ys, i - K, y)
      at(this.ys, i + Math.floor(K/2), y)
    }
  }
}

// 区間 xrangeでの関数を定義
interface RangedFunction
{
  xrange: Range
  f(x: number, t?: number): number
}

// 配列データを関数に変換するクラス
class ArrayFunction implements RangedFunction
{
  private array: Array<number>
  private _xrange: Range
  private _yrange: Range
  private _array_xrange: Range
  private _array_yrange: Range

  public constructor(array: Array<number>, xrange: Range, yrange: Range, ar_yrange: Range)
  {
    this.array = array
    this._xrange = xrange
    this._yrange = yrange
    this._array_xrange = new Range(0, array.length-1)
    this._array_yrange = ar_yrange
  }

  public setArray(ar: Array<number>, ar_yrange: Range)
  {
    this.array = ar
    this._array_xrange = new Range(0, ar.length-1)
    this._array_yrange = ar_yrange
  }

  public get xrange() { return this._xrange}
  public get yrange() { return this._yrange}
  public get array_xrange() { return this._array_xrange}
  public get array_yrange() { return this._array_yrange}

  public f(x: number): number
  {
    let i = convertRange(x, this.xrange, this._array_xrange)
    let y = at(this.array, Math.floor(i))
    let yy = convertRange(y, this._array_yrange, this.yrange)
    return yy
  }
}

// マウスのドラッグ軌跡関数
class MouseYFunction implements RangedFunction
{
  private mouse: MouseTrack
  private mousePlot: ArrayFunction
  private yrangeInv: Range

  public constructor(N: number, xrange: Range, yrange: Range, win_yrange: Range)
  {
    this.mouse = new MouseTrack(N)
    this.mousePlot = new ArrayFunction(this.mouse.ys, xrange, yrange, win_yrange)

    this.yrangeInv = new Range(yrange.r1, yrange.r0)
  }

  public get xrange() { return this.mousePlot.xrange }

  public add(i: number, y: number)
  {
    this.mouse.add(i, y)
  }

  public f(x: number): number
  {
    let y = this.mousePlot.f(x)

    // y軸を反転
    let yy = convertRange(y, this.mousePlot.yrange, this.yrangeInv)
    return yy
  }
}

// 差分法によるDiffusion Eqの数値解f(x)を求めるクラス
class DiffusionEqDiffSolver implements RangedFunction
{
  private diffusion_diff: Diff.Diffusion
  private _maxdt: number

  public constructor(xrange: Range, yrange: Range)
  {
    // Create Solver of Diffusion Eq
    let r = 0.5 - 0.05
    let N = 200
    let dx = xrange.length / N
    this._maxdt = r * dx * dx
    let param: Diff.parameter = { dt: this._maxdt, dx: dx, N: N }

    this.diffusion_diff = new Diff.Diffusion(
      param,
      (i: number) => 0 /* dummy */,
      (i: number) => {
        return 0
      },
      xrange
    )
  }

  public reset(initFunc: Func)
  {
    this.diffusion_diff.initialCondition = initFunc
    this.diffusion_diff.reset()
  }

  public calc(dt?: number)
  {
    this.diffusion_diff.calc(dt)
  }

  public get dt() { return this.diffusion_diff.dt }
  public set dt(v: number) { this.diffusion_diff.dt=v }
  public get t() { return this.diffusion_diff.t }
  public get maxdt() { return this._maxdt }
  public get xrange() { return this.diffusion_diff.xrange }

  public f(x: number)
  {
    return this.diffusion_diff.solution(x)
  }
}

class DiffusionEqApproxSolver implements RangedFunction
{
  private diffeq_approx: Diff.DiffusionEqSol

  public constructor(xrange: Range, yrange: Range, degree: number, Nx: number)
  {
    this.diffeq_approx = new Diff.DiffusionEqSol((x) => x/*=dummy*/, xrange, degree, Nx)
  }

  public reset(initFunc?: Func)
  {
    if (initFunc !== undefined)
    {
      this.diffeq_approx.initialCondition = initFunc
    }
    this.diffeq_approx.reset()
  }

  public get degree() { return this.diffeq_approx.degree }
  public set degree(v: number) { this.diffeq_approx.degree=v }

  public get xrange() { return this.diffeq_approx.xrange }

  public f(x: number, t: number)
  {
    return this.diffeq_approx.solution(x, t)
  }
}

class Plottable
{
  public g: PIXI.Graphics
  public width: number = 1
  public color: number = 0xaaaaaa
  public f: RangedFunction

  public constructor(f: RangedFunction, g: PIXI.Graphics, width?: number, color?: number)
  {
    this.f = f
    this.g = g
    if (width !== undefined)
    {
      this.width = width
    }
    if (color !== undefined)
    {
      this.color = color
    }
  }

  public plot(p: App.PixiPlot, t?: number)
  {
    p.plot((x: number) => this.f.f(x, t), this.width, this.color, this.g)
  }
}

class Main
{
  private pconf: App.PlotConfig = { dx: 0.002, xrange: new Range(0, 1), yrange: new Range(-2, 2) }
  private wconf: App.WinConfig = {winX: 800, winY: 600}

  private mouse: MouseYFunction
  private diffeq_diff: DiffusionEqDiffSolver
  private diffeq_approx: DiffusionEqApproxSolver

  private plot_mouse: Plottable
  private plot_diff: Plottable
  private plot_approx: Plottable

  private app: PIXI.Application
  private pixiplot: App.PixiPlot

  // 初期状態の関数を描画するためのGraphics
  private g_init = new PIXI.Graphics()
  private g_solution = new PIXI.Graphics()

  private guiConf =
  {
    fourierDegree: 20,
    run: false,
    dt: 0.0
  }
  private gui = new DAT.GUI()

  public constructor()
  {
    this.mouse = new MouseYFunction(this.wconf.winX, this.pconf.xrange, this.pconf.yrange, new Range(0, this.wconf.winY))
    this.diffeq_diff = new DiffusionEqDiffSolver(this.pconf.xrange, this.pconf.yrange)
    this.diffeq_approx = new DiffusionEqApproxSolver(this.pconf.xrange, this.pconf.yrange, this.guiConf.fourierDegree, this.wconf.winX)

    // Plottable
    this.plot_mouse = new Plottable(this.mouse, this.g_init, 1, 0xaaaaaa)
    this.plot_diff = new Plottable(this.diffeq_diff, this.g_solution, 1, 0x00aabb)
    this.plot_approx = new Plottable(this.diffeq_approx, this.g_solution, 1, 0xbbaa00)

    this.app = new PIXI.Application(this.wconf.winX, this.wconf.winY, { antialias: true });
    document.body.appendChild(this.app.view);
    this.app.stage.addChild(this.g_init)
    this.app.stage.addChild(this.g_solution)

    this.pixiplot = new App.PixiPlot(this.app, this.app.stage, this.wconf, this.pconf)
    this.pixiplot.start(true)

    // dat.gui
    this.guiConf.dt = this.diffeq_diff.maxdt
    this.gui.add(this.guiConf, "run")
    this.gui.add(this.guiConf, "fourierDegree", 0, 70, 1)
    .onChange(() => {
      this.diffeq_approx.degree = this.guiConf.fourierDegree
      this.diffeq_approx.reset()
    })
    this.gui.add(this.guiConf, "dt", 0, this.diffeq_diff.maxdt, this.diffeq_diff.maxdt / 20)
      .onChange(() => {
        this.diffeq_diff.dt = this.guiConf.dt
      })


    this.pixiplot.onPointerMove = (g: PIXI.Graphics, p: PIXI.Point) => 
    {
      this.mouse.add(p.x, p.y)

      this.update()

      this.g_init.clear()
      this.plot_mouse.plot(this.pixiplot)
    }

    this.pixiplot.onTick = (g: PIXI.Graphics, delta: number) => 
    {
      this.g_solution.clear()

      if (this.guiConf.run) {
        for (var i = 0; i < 10; i++) {
          this.diffeq_diff.calc(this.guiConf.dt * delta)
        }
      }
      this.plot_diff.plot(this.pixiplot)
      this.plot_approx.plot(this.pixiplot, this.diffeq_diff.t)
    }
  }

  public update() 
  {
    this.diffeq_diff.reset((x: number) => this.mouse.f(x))
    this.diffeq_approx.reset((x: number) => this.mouse.f(x))
  }

  public calc() 
  {
    this.diffeq_diff.calc()
  }
}

let main = new Main()