//import * as ORTH from './lib/ortho';
import {Func, Range, convertRange} from './lib/math'
import * as App from './lib/PixiPlot'
import * as DAT from 'dat.gui'
import * as Math from 'mathjs'
import * as Diff from './diffusion'
import * as ORTH from './lib/ortho'
import {at} from './lib/array'

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

function array2fx(ys: Array<number>, xrange: Range): Func
{
  const arrayRange = new Range(0, ys.length-1)
  let fx = (x: number) => {
    let i = convertRange(x, xrange, arrayRange)
    let y = at(ys, Math.floor(i))
    return y
  }
  return fx
}

function track2func(t: MouseTrack, xrange: Range, yrange: Range, winY: number): Func
{
  let f = array2fx(t.ys.map((y)=>winY-y), xrange)
  const winYRange = new Range(0, winY)
  return (x)=>convertRange(f(x), winYRange, yrange)
}

let wconf: App.WinConfig = {winX: 800, winY: 600}
let pconf: App.PlotConfig = {dx: 0.002, xrange: new Range(0, 1), yrange: new Range(-2, 2)}

var app = new PIXI.Application(wconf.winX, wconf.winY, { antialias: true });
document.body.appendChild(app.view);

let guiConf =
{
  plotEq: false,
  fourierDegree: 20,
  run: false,
  dt: 0.0
}

// Create Plot
let f = new App.PixiPlot(app, app.stage, wconf, pconf)
f.start(true)
let track = new MouseTrack(wconf.winX)

let g_init = new PIXI.Graphics()
app.stage.addChild(g_init)

function plotInitialState(g: PIXI.Graphics) {
  g_init.clear()

  let diffF = array2fx(d.ar, pconf.xrange)
  f.plot(diffF, 1, 0x00ffff, g_init)

  let mousef = track2func(track, pconf.xrange, pconf.yrange, wconf.winY)
  solution.initialCondition = mousef
  solution.setInitialValue()
  f.plot(
    (x: number) => solution.solution(x, 0),
    1, 0xff0000,
    g_init
  )
}

f.onPointerMove = (g: PIXI.Graphics, p: PIXI.Point) =>
{
  track.add(p.x, p.y)
  let mousef = track2func(track, pconf.xrange, pconf.yrange, wconf.winY)
  d.initialCondition = (i: number) => mousef(i * d.dx)
  d.reset()

  plotInitialState(g)

  guiConf.plotEq = false
  //for (var i=0; i<4; i++)
  //{
  //  d.calc(d.dt)
  //}
}

function fit(f: Func, base: ORTH.OrthogonalFunction, degree: number, Nx: number,
  plotRange: Range)
{
  let f_ranged : Func = (x: number) => f(convertRange(x, base.xrange ,plotRange))
  let fitted = ORTH.fit(f_ranged, base, degree, Nx)
  let fitted_ranged = (x: number) => fitted(convertRange(x, plotRange, base.xrange))
  return fitted_ranged
}

function fitFourier(f: Func, degree: number, Nx: number, plotRange: Range)
{
  let fittedEven = fit(f, new ORTH.FourierEven, degree, Nx, plotRange)
  let fittedOdd =  fit(f, new ORTH.FourierOdd, degree, Nx, plotRange)
  return (x: number) => fittedEven(x) + fittedOdd(x)
}

let baseFunc : ORTH.OrthogonalFunction = new ORTH.LegendrePolynomial
baseFunc;
f.onPointerUp = (g: PIXI.Graphics) =>
{
  fitFourier
  //f.clearPlot()
  //let plotFunc = fitFourier(track2func(track, pconf.xrange, pconf.yrange, wconf.winY), 20, 100, pconf.xrange)
  //f.plot(plotFunc)
}

f.onPointerDown = (g: PIXI.Graphics) =>
{
}
//let initexp = Math.parse(guiConf.init)
//let a = (x: number) => initexp.eval({x: x})

// Create Solver of Diffusion Eq
let r = 0.5 - 0.05
let N = 200
let dx = pconf.xrange.length / N
const maxdt = r * dx * dx
let param: Diff.parameter = {dt: maxdt, dx: dx, N: N}
guiConf.dt = maxdt
let d = new Diff.Diffusion(
  param,
  (i: number) => 0,
  (i: number) =>
  {
    i;
    return 0
  },
  pconf.xrange
)

let solution = new Diff.DiffusionEqSol((x)=>x, pconf.xrange, 30, 400)
f.onTick = (g: PIXI.Graphics, delta: number) =>
{
  g.clear()

  if (guiConf.run)
  {
    for (var i=0; i<10; i++)
    {
      d.calc()
    }
  }

  f.plot((x: number) => d.solution(x), 1, 0x00ffff, g)

  f.plot(
    (x: number) => solution.solution(x, d.t),
    1, 0xff0000, g
  )
}

let gui = new DAT.GUI();
//gui.add(guiConf, "init")
//.onChange(() =>
//{
//  let p = Math.parse(guiConf.init)
//  p
//  console.log(guiConf.init)
//  //d.initialCondition = (x) => p.eval({x: x*d.dx})
//  //d.setInitialValue()
//  //d.setBoundary()
//
//  solution.initialCondition = (x) => p.eval({ x: x })
//  solution.setInitialValue()
//
//  f.clearPlot()
//  //f.plot((x: number) => u(d.ar, x), 3, 0x00ffff)
//  //f.plot(
//  //  (x: number) => solution.sol(x, d.t),
//  //  3, 0xff0000
//  //)
//})

//gui.add(guiConf, "plotEq")
//.onChange(() =>
//{
//  if (guiConf.plotEq)
//  {
//    let p = Math.parse(guiConf.init)
//    d.initialCondition = (x) => p.eval({ x: x * d.dx })
//    d.reset()
//
//    solution.initialCondition = (x) => p.eval({ x: x })
//    solution.setInitialValue()
//
//    g_init.clear()
//  }
//})

gui.add(guiConf, "run")
.onChange(() =>
{
  //f.start(guiConf.run)
  //console.log(d.t)
})

gui.add(guiConf, "fourierDegree", 0, 40, 1)
.onChange(() =>
{
  solution.degree = guiConf.fourierDegree
  solution.reset()
})

gui.add(guiConf, "dt", 0, maxdt, maxdt/10)
.onChange(() =>
{
  d.dt = guiConf.dt
})