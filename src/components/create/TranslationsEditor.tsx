import { useState, useEffect, useCallback } from 'react'
import {
  Languages,
  Plus,
  Save,
  Trash2,
  Globe,
  Search,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { PackLanguageInfo } from '@/shared/hymn-types'
import { cn } from '@/lib/utils'

// Available languages for creating new language files
const AVAILABLE_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'sv-SE', name: 'Swedish' },
  { code: 'da-DK', name: 'Danish' },
  { code: 'fi-FI', name: 'Finnish' },
  { code: 'no-NO', name: 'Norwegian' },
]

interface TranslationsEditorProps {
  packPath: string
}

interface TranslationRow {
  key: string
  value: string
  isNew?: boolean
}

export function TranslationsEditor({ packPath }: TranslationsEditorProps) {
  const [languages, setLanguages] = useState<PackLanguageInfo[]>([])
  const [selectedLang, setSelectedLang] = useState<string | null>(null)
  const [translations, setTranslations] = useState<TranslationRow[]>([])
  const [originalTranslations, setOriginalTranslations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewLangDialog, setShowNewLangDialog] = useState(false)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [newLangCode, setNewLangCode] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if there are unsaved changes
  const hasChanges = useCallback(() => {
    const currentTranslations: Record<string, string> = {}
    for (const row of translations) {
      if (row.key.trim()) {
        currentTranslations[row.key] = row.value
      }
    }
    const originalKeys = Object.keys(originalTranslations).sort()
    const currentKeys = Object.keys(currentTranslations).sort()

    if (originalKeys.length !== currentKeys.length) return true
    for (let i = 0; i < originalKeys.length; i++) {
      if (originalKeys[i] !== currentKeys[i]) return true
      if (originalTranslations[originalKeys[i]] !== currentTranslations[currentKeys[i]]) return true
    }
    return false
  }, [translations, originalTranslations])

  // Load available languages
  const loadLanguages = useCallback(async () => {
    try {
      const result = await window.hymn.listPackLanguages({ packPath })
      setLanguages(result.languages)

      // Auto-select first language if none selected
      if (!selectedLang && result.languages.length > 0) {
        setSelectedLang(result.languages[0].code)
      }
    } catch (err) {
      console.error('Failed to load languages:', err)
      setError('Failed to load languages')
    }
  }, [packPath, selectedLang])

  // Load translations for selected language
  const loadTranslations = useCallback(async () => {
    if (!selectedLang) {
      setTranslations([])
      setOriginalTranslations({})
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.hymn.getPackTranslations({ packPath, langCode: selectedLang })
      const rows: TranslationRow[] = Object.entries(result.translations)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({ key, value }))

      setTranslations(rows)
      setOriginalTranslations(result.translations)
    } catch (err) {
      console.error('Failed to load translations:', err)
      setError('Failed to load translations')
      setTranslations([])
      setOriginalTranslations({})
    } finally {
      setIsLoading(false)
    }
  }, [packPath, selectedLang])

  // Initial load
  useEffect(() => {
    loadLanguages()
  }, [loadLanguages])

  // Load translations when language changes
  useEffect(() => {
    loadTranslations()
  }, [loadTranslations])

  // Save translations
  const handleSave = async () => {
    if (!selectedLang) return

    setIsSaving(true)
    setError(null)

    try {
      const translationsMap: Record<string, string> = {}
      for (const row of translations) {
        if (row.key.trim()) {
          translationsMap[row.key.trim()] = row.value
        }
      }

      await window.hymn.savePackTranslations({
        packPath,
        langCode: selectedLang,
        translations: translationsMap,
      })

      setOriginalTranslations(translationsMap)
      await loadLanguages() // Refresh entry counts
    } catch (err) {
      console.error('Failed to save translations:', err)
      setError('Failed to save translations')
    } finally {
      setIsSaving(false)
    }
  }

  // Create new language
  const handleCreateLanguage = async () => {
    if (!newLangCode) return

    try {
      await window.hymn.createPackLanguage({ packPath, langCode: newLangCode })
      await loadLanguages()
      setSelectedLang(newLangCode)
      setShowNewLangDialog(false)
      setNewLangCode('')
    } catch (err) {
      console.error('Failed to create language:', err)
      setError('Failed to create language')
    }
  }

  // Add new translation key
  const handleAddKey = () => {
    if (!newKey.trim()) return

    // Check for duplicate key
    if (translations.some((t) => t.key === newKey.trim())) {
      setError('Key already exists')
      return
    }

    setTranslations((prev) => [
      ...prev,
      { key: newKey.trim(), value: newValue, isNew: true },
    ].sort((a, b) => a.key.localeCompare(b.key)))

    setShowNewKeyDialog(false)
    setNewKey('')
    setNewValue('')
  }

  // Update translation value
  const handleUpdateValue = (key: string, value: string) => {
    setTranslations((prev) =>
      prev.map((t) => (t.key === key ? { ...t, value } : t))
    )
  }

  // Delete translation key
  const handleDeleteKey = (key: string) => {
    setTranslations((prev) => prev.filter((t) => t.key !== key))
    setKeyToDelete(null)
  }

  // Filter translations by search query
  const filteredTranslations = translations.filter(
    (t) =>
      t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.value.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get available languages that aren't already created
  const availableNewLanguages = AVAILABLE_LANGUAGES.filter(
    (lang) => !languages.some((l) => l.code === lang.code)
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Translations</h2>
          {hasChanges() && (
            <Badge variant="outline" className="text-amber-500 border-amber-500">
              Unsaved
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewLangDialog(true)}
            disabled={availableNewLanguages.length === 0}
          >
            <Globe className="h-4 w-4 mr-1" />
            Add Language
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges() || isSaving || !selectedLang}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Language selector and search */}
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Select value={selectedLang || ''} onValueChange={setSelectedLang}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.name} ({lang.entryCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search translations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewKeyDialog(true)}
          disabled={!selectedLang}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Key
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Translations list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Loading translations...
          </div>
        ) : !selectedLang ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <Globe className="h-8 w-8" />
            <p>Select or create a language to edit translations</p>
          </div>
        ) : filteredTranslations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <Languages className="h-8 w-8" />
            <p>{searchQuery ? 'No translations match your search' : 'No translations yet'}</p>
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewKeyDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Translation
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredTranslations.map((row) => (
              <div
                key={row.key}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 hover:bg-muted/50',
                  row.isNew && 'bg-green-500/5'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {row.key}
                    </code>
                    {row.isNew && (
                      <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <Input
                    value={row.value}
                    onChange={(e) => handleUpdateValue(row.key, e.target.value)}
                    placeholder="Translation value..."
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0 mt-6"
                  onClick={() => setKeyToDelete(row.key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* New Language Dialog */}
      <Dialog open={showNewLangDialog} onOpenChange={setShowNewLangDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Language</DialogTitle>
            <DialogDescription>
              Create a new language file for translations.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newLangCode} onValueChange={setNewLangCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                {availableNewLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewLangDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLanguage} disabled={!newLangCode}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Translation Key</DialogTitle>
            <DialogDescription>
              Add a new translation entry. Use the format: items.ItemId.name or blocks.BlockId.name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Key</label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="items.MySword.name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Value</label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="My Sword"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKey} disabled={!newKey.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Translation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the translation key "{keyToDelete}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => keyToDelete && handleDeleteKey(keyToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
