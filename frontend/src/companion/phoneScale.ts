export const phoneScale = (width: number) => width < 768 ? 0.9 : 1;
export const viewportScale = () => phoneScale(typeof innerWidth === "number" ? innerWidth : 1024);
