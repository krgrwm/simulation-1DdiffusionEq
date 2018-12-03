import * as PIXI from 'pixi.js';
import {Range} from './math'
import * as PLOT from './plot'

export interface WinConfig
{
  winX: number
  winY: number
}

export interface PlotConfig
{
  dx: number
  xrange: Range
  yrange: Range
}

export class PixiPlot {
  parent: PIXI.Container
  winConfig: WinConfig
  plotConfig: PlotConfig

  isDown: Boolean = false
  isCleared: Boolean = false

  g_axis : PIXI.Graphics = new PIXI.Graphics
  g_plot : PIXI.Graphics = new PIXI.Graphics
  g_input: PIXI.Graphics = new PIXI.Graphics

  onPointerDown: (g: PIXI.Graphics)=>void = ()=>{}
  onPointerUp  : (g: PIXI.Graphics)=>void = ()=>{}
  onPointerMove: (g: PIXI.Graphics, p: PIXI.Point)=>void = ()=>{}
  onTick: (g: PIXI.Graphics, delta: number) => void = ()=>{}

  ticker = new PIXI.ticker.Ticker();

  constructor(app: PIXI.Application, parent: PIXI.Container, wc: WinConfig, pc: PlotConfig) {
    this.parent = parent
    this.winConfig = wc
    this.plotConfig = pc

    app.stage.interactive = true;

    this.parent.addChild(this.g_axis)
    this.parent.addChild(this.g_input)
    this.parent.addChild(this.g_plot)

    app.renderer.plugins.interaction
      .on("pointerdown", () => this._onPointerDown())
      .on("pointerup",   () => this._onPointerUp())
      .on("pointermove", (e: PIXI.interaction.InteractionEvent) => this._onPointerMove(e))

    this.ticker.add((d:number) => this._onTick(d))

    this.plotAxis()
  }

  plot(f: (x:number)=>number, lineWidth: number = 4, color: number = 0x00ffff, g: PIXI.Graphics = this.g_plot)
  {
    g.lineStyle(lineWidth, color, 1);
    PLOT.plot(g, f, this.plotConfig.dx, this.plotConfig.xrange, this.plotConfig.yrange, this.winConfig.winX, this.winConfig.winY)
  }

  private plotAxis()
  {
    this.plot((x) => 0, 0.5, 0xaaaaaa, this.g_axis)
  }
  _onPointerDown()
  {
    this.isDown = true
    this.onPointerDown(this.g_plot)
  }

  _onPointerUp()
  {
    this.isDown = false
    if (this.isCleared) {
      this.isCleared = false
      return
    }

    this.onPointerUp(this.g_plot)
  }

  _onPointerMove(e: PIXI.interaction.InteractionEvent)
  {
    if (!this.isDown) {
      return
    }

    let pos = e.data.getLocalPosition(this.parent)
    this.onPointerMove(this.g_input, pos)
  }

  _onTick(delta: number)
  {
    this.onTick(this.g_plot, delta)
    this.plotAxis()
  }

  clearPlot()
  {
    this.g_plot.clear()
    this.plotAxis()
  }

  start(f: Boolean)
  {
    if (f)
    {
      this.ticker.start()
    } else{
      this.ticker.stop()
    }
  }
}