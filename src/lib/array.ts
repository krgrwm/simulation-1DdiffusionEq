export function at<T>(ar: Array<T>, i: number): T
export function at<T>(ar: Array<T>, i: number, val: T): void
export function at<T>(ar: Array<T>, i: number, val: T|null=null): T|void
{
  const x = ar[i]
  if (x==null)
  {
    console.assert(false, `array value is undefined!: index=${i}, length=${ar.length}`)
    return
  }

  if (val == null)
  {
    return x;
  }
  else
  {
    ar[i] = val
  }
  return x
}