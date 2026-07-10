/// <reference types="vite/client" />

declare module '@nimiq/identicons/dist/identicons.bundle.min.js' {
  interface IdenticonsApi {
    render(text: string, element: HTMLElement): Promise<void>
    svg(text: string): Promise<string>
    toDataUrl(text: string): Promise<string>
  }
  const Identicons: IdenticonsApi
  export default Identicons
}