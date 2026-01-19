import type { JavaClassTemplate } from '../hymn-types'

/**
 * Icon names for Java class templates.
 * Maps to lucide-react icon names.
 */
export type JavaClassIconName =
  | 'Terminal'
  | 'Radio'
  | 'Puzzle'
  | 'FileCode'

/**
 * Java class template metadata.
 */
export interface JavaClassTemplateInfo {
  id: JavaClassTemplate
  label: string
  description: string
  iconName: JavaClassIconName
  /**
   * Suggested package name for this template type.
   * Empty string means no suggestion (use root package).
   */
  suggestedPackage: string
}

/**
 * All Java class templates with their metadata.
 * Single source of truth for both frontend display and backend code generation.
 */
export const JAVA_CLASS_TEMPLATES: JavaClassTemplateInfo[] = [
  {
    id: 'command',
    label: 'Command',
    description: 'Chat command handler',
    iconName: 'Terminal',
    suggestedPackage: 'commands',
  },
  {
    id: 'event_listener',
    label: 'Event Listener',
    description: 'Game event hooks',
    iconName: 'Radio',
    suggestedPackage: 'listeners',
  },
  {
    id: 'component',
    label: 'Component',
    description: 'Entity component',
    iconName: 'Puzzle',
    suggestedPackage: 'components',
  },
  {
    id: 'custom_class',
    label: 'Class',
    description: 'Empty Java class',
    iconName: 'FileCode',
    suggestedPackage: '',
  },
]

/**
 * Get template info by ID.
 */
export function getJavaClassTemplate(id: JavaClassTemplate): JavaClassTemplateInfo | undefined {
  return JAVA_CLASS_TEMPLATES.find(t => t.id === id)
}

/**
 * Get suggested package for a template type.
 */
export function getTemplateSuggestedPackage(templateId: JavaClassTemplate): string {
  const template = getJavaClassTemplate(templateId)
  return template?.suggestedPackage ?? ''
}
