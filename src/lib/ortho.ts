import {Func, Range} from './math';

function I(x: number)
{
  x;
  return 1
}

export function integrate(f: Func, N: number, xrange: Range, rho: Func= I)
{
  let a = xrange.r0
  let b = xrange.r1
  let width = xrange.length
  let h = width / N
  let sum = 0
  for (var i=1; i<N; i++)
  {
    var x = a + i*h
    var res = f(x) * rho(x)
    sum += res
  }
  sum *= 2
  sum += f(a+h/2) + f(b-h/2)
  sum *= 0.5*h

  return sum
}

export class OrthogonalFunction
{
  xrange: Range = new Range(0, 0)

  public normalizeC(n: number)
  {
    return 1
  }

  public P(n: number, x: number)
  {
    return 0
  }
}

export class LegendrePolynomial extends OrthogonalFunction
{
  private combination(n: number, r: number) : number
  {
    if (2*(n-r) > n)
    {
      return this.combination(n, n-r)
    }

    let num = 1;
    for (var i = 1; i <= r; i++) {
      num = num * (n - i + 1) / i;
    }
    return num;
  }

  public readonly xrange: Range = new Range(-1, 1)
  public normalizeC(n: number)
  {
    return (2.0 * n + 1) / 2.0
  }

  public P(n: number, x: number)
  {
    if (n==0)
    {
      return 1
    } else if (n==1)
    {
      return x
    }
    let sum = 0
    for (var k=0; k<=n; k++)
    {
      sum += Math.pow(x, k) * this.combination(n, k) * this.combination((n+k-1)/2, n)
    }
    sum *= Math.pow(2, n)
    return sum
  }
}
export class ChebyshevPolynomial extends OrthogonalFunction
{

  public readonly xrange: Range = new Range(-1, 1)

  public P(n: number, x: number)
  {
    return Math.cos(n * Math.acos(x))
  }

  public normalizeC(n: number)
  {
      let C = 1
      if (n == 0)
      {
        C = Math.PI
      }
      else
      {
        C = Math.PI * 0.5
      }
      return 1.0 / C
  }
}

export class Fourier// extends OrthogonalFunction
{
  public readonly xrange: Range = new Range(-Math.PI, Math.PI)

  public P0(n: number, x: number)
  {
    return Math.cos(n*x)
  }

  public P1(n: number, x: number)
  {
    return Math.sin(n*x)
  }

  public coeff(f: Func, degree: number, N: number)
  {
    let ar1 = new Array(degree)
    let ar2 = new Array(degree)
    ar1[0] = 0.5 / Math.PI * integrate(f, N, this.xrange)
    ar2[0] = 0.0
    let _this = this
    for (var i = 1; i <= degree; i++) {
      ar1[i] = 1.0 / Math.PI * integrate(function (x: number) { return _this.P0(i, x) * f(x) }, N, _this.xrange)
      ar2[i] = 1.0 / Math.PI * integrate(function (x: number) { return _this.P1(i, x) * f(x) }, N, _this.xrange)
    }
    return [ar1, ar2]
  }

  // [-PI, PI] => xrange
  public normalize(x: number, xrange: Range) {
    let s = xrange.length * (x / (2 * Math.PI) + 0.5) + xrange.r0
    return s
  }

  // xrange => [-PI, PI]
  public normalizeInv(s: number, xrange: Range) {
    let x = Math.PI * (2 * (s - xrange.r0) / xrange.length - 1)
    return x
  }

  public fittedFunc(f: Func, degree: number, Nx: number): Func
  {
    let coeff = this.coeff(f, degree, Nx)

    let _this = this
    let fitted = function (x: number) {
      let res = 0;
      for (var i = 0; i <= degree; i++) {
        res += coeff[0][i] * _this.P0(i, x) + coeff[1][i] * _this.P1(i, x)
      }
      return res
    }
    return fitted
  }

  public coeffWithRange(f: Func, degree: number, N: number, xrange: Range)
  {
    let normf = (x: number) => {
      return f(this.normalize(x, xrange))
    }
    return this.coeff(normf, degree, N)
  }

  public fittedFuncWithRange(f: Func, degree: number, Nx: number, xrange: Range): Func
  {
    let normf = (x: number) => {
      return f(this.normalize(x, xrange))
    }

    let fitted = this.fittedFunc(normf, degree, Nx)
    return (x: number) => fitted(this.normalizeInv(x, xrange))
  }
}

export class FourierEven extends OrthogonalFunction
{
  public readonly xrange: Range = new Range(-Math.PI, Math.PI)

  public P(n: number, x: number)
  {
    return Math.cos(n*x)
  }

  public normalizeC(n: number)
  {
    if (n == 0)
    {
      return 0.5 / Math.PI
    }
    return 1.0 / Math.PI
  }
}

export class FourierOdd extends OrthogonalFunction
{
  public readonly xrange: Range = new Range(-Math.PI, Math.PI)

  public P(n: number, x: number)
  {
    return Math.sin(n*x)
  }

  public normalizeC(n: number)
  {
    if (n==0)
    {
      return 0
    }
    return 1.0 / Math.PI
  }
}


export function coeff(f: Func, base: OrthogonalFunction, degree: number, N: number)
{
  let ar = new Array<number>(degree)
  for (var i = 0; i <= degree; i++) {
    ar[i] = integrate(
      (x: number) => base.P(i, x) * f(x),
      N,
      base.xrange)
    ar[i] = ar[i] * base.normalizeC(i)
  }
  return ar
}

export function fit(f: Func, base: OrthogonalFunction, degree: number, Nx: number)
{
  let c = coeff(f, base, degree, Nx)

  let fitted = function (x: number) {
    let res = 0;
    for (var i = 0; i <= degree; i++) {
      res += c[i] * base.P(i, x)
    }
    return res
  }
  return fitted
}