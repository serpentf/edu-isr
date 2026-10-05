<template>
  <div ref="host" class="border rounded overflow-hidden"></div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';

export default {
  name: 'CodeEditor',
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, default: 'Редактор кода' }
  },
  emits: ['update:modelValue', 'run'],
  setup(props, { emit }) {
    const host = ref(null);
    let view = null;

    onMounted(() => {
      view = new EditorView({
        doc: props.modelValue,
        parent: host.value,
        extensions: [
          basicSetup,
          javascript(),
          keymap.of([
            { key: 'Mod-Enter', run: () => { emit('run'); return true; } },
            indentWithTab
          ]),
          EditorView.contentAttributes.of({ 'aria-label': props.label }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) emit('update:modelValue', update.state.doc.toString());
          }),
          // Editor sizing is CodeMirror configuration, not page CSS
          EditorView.theme({
            '&': { fontSize: '0.875rem' },
            '.cm-content, .cm-gutter': { minHeight: '16rem' }
          })
        ]
      });
    });

    watch(() => props.modelValue, (value) => {
      if (view && value !== view.state.doc.toString()) {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
      }
    });

    onBeforeUnmount(() => view?.destroy());

    return { host };
  }
};
</script>
