export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const todayIso = () => isoDay(new Date());
