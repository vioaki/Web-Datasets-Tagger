import { t } from '../../i18n/translate'
export interface ModelDefinition { name: string; inputSize: number; modelUrl: string; tagsUrl: string }

export const MODELS: ModelDefinition[] = [
  'wd-swinv2-tagger-v3', 'wd-eva02-large-tagger-v3', 'wd-vit-large-tagger-v3',
  'wd-convnext-tagger-v3', 'wd-v1-4-moat-tagger-v2', 'wd-v1-4-convnextv2-tagger-v2',
  'Z3D-E621-Convnext',
].map((name) => {
  const repo = `${name === 'Z3D-E621-Convnext' ? 'toynya' : 'SmilingWolf'}/${name}`
  const base = `https://huggingface.co/${repo}/resolve/main/`
  return { name, inputSize: 448, modelUrl: base + 'model.onnx', tagsUrl: base + (name === 'Z3D-E621-Convnext' ? 'tags-selected.csv' : 'selected_tags.csv') }
})

export function modelDefinition(name: string, mirror: boolean): ModelDefinition {
  const model = MODELS.find((m) => m.name === name)
  if (!model) throw new Error(t("请选择有效模型"))
  return mirror ? { ...model, modelUrl: model.modelUrl.replace('huggingface.co', 'hf-mirror.com'), tagsUrl: model.tagsUrl.replace('huggingface.co', 'hf-mirror.com') } : model
}
