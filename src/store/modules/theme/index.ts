import { computed, ref, toRefs } from 'vue';
import type { Ref } from 'vue';
import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';
import { useAppStore } from '@/store/modules/app';

/** Theme store */
export const useThemeStore = defineStore(SetupStoreId.Theme, () => {
    const appStore = useAppStore();

    /** Theme settings：明暗主题从 appStore 读取，保证启动时沿用上次选择而不是默认深色 */
    const settings: Ref<App.Theme.ThemeSetting> = ref({
        themeScheme: appStore.themeScheme,
        layout: {
            mode: 'collapse'
        }
    });

    /** Dark mode：完全由用户选择的主题方案决定，不受系统主题影响 */
    const darkMode = computed(() => settings.value.themeScheme === 'dark');

    /** Reset store */
    function resetStore() {
        const themeStore = useThemeStore();

        themeStore.$reset();
    }

    /**
     * Set theme scheme
     *
     * @param themeScheme
     */
    function setThemeScheme(themeScheme: UnionKey.ThemeScheme) {
        settings.value.themeScheme = themeScheme;
        // 持久化到 appStore，下次启动从 appStore 读取保持所选主题
        appStore.setThemeScheme(themeScheme);
    }

    /**
   * Set theme layout
   *
   * @param mode Theme layout mode
   */
    function setThemeLayout(mode: UnionKey.ThemeLayoutMode) {
        settings.value.layout.mode = mode;
    }

    /** Toggle theme scheme */
    function toggleThemeScheme() {

        const themeSchemes: UnionKey.ThemeScheme[] = ['light', 'dark'];

        const index = themeSchemes.findIndex(item => item === settings.value.themeScheme);

        const nextIndex = index === themeSchemes.length - 1 ? 0 : index + 1;

        const nextThemeScheme = themeSchemes[nextIndex];

        setThemeScheme(nextThemeScheme);
    }

    return {
        ...toRefs(settings.value),
        darkMode,
        resetStore,
        setThemeScheme,
        setThemeLayout,
        toggleThemeScheme
    };
});
