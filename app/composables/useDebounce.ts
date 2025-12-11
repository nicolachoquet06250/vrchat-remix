export const useDebounce = <T>(v: Ref<T>, ms: number) => {
    let to: number|NodeJS.Timeout|null = null;
    const r = ref(unref(v));

    watch(v, v => {
        to && clearTimeout(to);
        to = setTimeout(() => r.value = v, ms);
    });

    return r;
}