import { computed, ref, toRefs } from 'vue';
import type { Ref } from 'vue';
import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';

/** Theme store */
export const useThemeStore = defineStore(SetupStoreId.Theme, () => {
    /** Theme settings */
    const settings: Ref<App.Theme.ThemeSetting> = ref({
        themeScheme: 'dark',
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
