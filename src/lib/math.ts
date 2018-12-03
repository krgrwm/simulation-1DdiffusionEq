export interface IRange
{
  r0: number
  r1: number
  readonly length : number
}

export class Range implements IRange
{
  r0: number
  r1: number

  public constructor(r0: number, r1: number)
  {
    this.r0 = r0
    this.r1 = r1
  }

  public get length() {
    return this.r1 - this.r0
  }
}

export interface Func {
  (x: number): number
}

export function convertRange(x: number, fromRange: Range, toRange: Range) {
  let normalizedX = (x-fromRange.r0) / fromRange.length
  return normalizedX * toRange.length + toRange.r0
}

export function interpolate(ys: Array<number>, aveRange: number, invalidNumber: number) {
  for (var i = 0; i < ys.length; i++) {
    if (ys[i] == invalidNumber) {
      ys[i] = 0
      var sum = 1
      for (var j = 0; j < aveRange; j++) {
        var t1 = ys[i - j]
        var t2 = ys[i + j]
        if (t1 != invalidNumber) {
          ys[i] += t1
          sum++
        }
        if (t2 != invalidNumber) {
          ys[i] += t2
          sum++
        }
      }
      ys[i] = ys[i] / sum
    }
  }
}