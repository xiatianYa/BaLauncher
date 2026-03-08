import { defineConfig } from '@unocss/vite';
import transformerDirectives from '@unocss/transformer-directives';
import transformerVariantGroup from '@unocss/transformer-variant-group';
import type { Theme } from '@unocss/preset-uno';

export default defineConfig<Theme>({
    content: {
        pipeline: {
            exclude: ['node_modules', 'dist']
        }
    },
    theme: {
        fontSize: {
            'icon-xs': '0.875rem',
            'icon-small': '1rem',
            icon: '1.125rem',
            'icon-large': '1.5rem',
            'icon-xl': '2rem'
        }
    },
    shortcuts: {
        'card-wrapper': 'rd-8px shadow-sm'
    },
    transformers: [transformerDirectives(), transformerVariantGroup()],
});
