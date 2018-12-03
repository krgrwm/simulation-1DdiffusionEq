import * as PIXI from 'pixi.js';
import {Func, Range} from './math';

export function quantize(f: Func, dx: number, xrange: Range)
{
  let Nx = Math.trunc(xrange.length / dx) + 1
  let xs = Array(Nx)
  let ys = Array(Nx)
  for (var i = 0; i < Nx; i++) {
    xs[i] = xrange.r0 + i * dx
    ys[i] = f(xs[i])
  }
  return [xs, ys]
}

export function plot(g: PIXI.Graphics, f: Func, dx: number,
  xrange: Range, yrange: Range, winX: number, winY: number)
{
  let [xs, ys] = quantize(f, dx, xrange)
  plot_quantized(g, xs, ys, dx, xrange, yrange, winX, winY)
}

export function plot_quantized(g: PIXI.Graphics,
  xs: Array<number>, ys: Array<number>, dx: number,
  xrange: Range, yrange: Range, winX: number, winY: number)
{
  let xstart = xrange.r0
  let ystart = yrange.r0

  // set a fill and line style
  let yunit = winY / yrange.length
  let xunit = winX / xrange.length
  let offsety = -ystart * yunit
  let offsetx = -xstart * xunit

  var x = xs[0] * xunit + offsetx
  var y = ys[0] * yunit + offsety
  y = winY - y
  g.moveTo(x, y)
  let Nx = Math.trunc(xrange.length / dx)+1
  for (var i = 1; i < Nx; i++) {
    var x = xs[i] * xunit + offsetx
    var y = ys[i] * yunit + offsety
    y = winY - y
    g.lineTo(x, y)
  }
}