function ucFirst(s: string) {
    if (s.length === 0) return '';

    return s.slice(0, 1).toUpperCase() + s.slice(1);
}

export const useHelpers = () => ({
    ucFirst
})