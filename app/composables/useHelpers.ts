function ucFirst(s: string) {
    if (s.length === 0) return '';

    return s.slice(0, 1).toUpperCase() + s.slice(1);
}

function convertDateFromLocal(date: Date|string) {
    const {locale} = useI18n()

    const convertedDate = ref(new Date(date).toLocaleDateString(locale.value));

    watch(locale, () => {
        convertedDate.value = new Date(date).toLocaleDateString(locale.value);
    })

    return convertedDate;
}

export const useHelpers = () => ({
    ucFirst, convertDateFromLocal
})