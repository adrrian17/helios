const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export const formatDate = (date: Date) => dateFormat.format(date);
