import { computed, effectScope, onScopeDispose, ref, toRefs } from 'vue';
import type { Ref } from 'vue';
import { usePreferredColorScheme } from '@vueuse/core';
import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';

/** Theme store */
export const useThemeStore = defineStore(SetupStoreId.Theme, () => {
    const scope = effectScope();
    const osTheme = usePreferredColorScheme();

    /** Theme settings */
    const settings: Ref<App.Theme.ThemeSetting> = ref({
        themeScheme: 'light',
        layout: {
            mode: 'expand'
        }
    });

    /** Dark mode */
    const darkMode = computed(() => {
        if (settings.value.themeScheme === 'light') {
            return osTheme.value === 'dark';
        }
        return settings.value.themeScheme === 'dark';
    });

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

    /** On scope dispose */
    onScopeDispose(() => {
        scope.stop();
    });

    return {
        ...toRefs(settings.value),
        darkMode,
        resetStore,
        setThemeScheme,
        setThemeLayout,
        toggleThemeScheme
    };
});
