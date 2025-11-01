<!--
  Icon Component - Lucide Vue Icons Wrapper

  Usage:
    <Icon name="edit" class="h-5 w-5 text-blue-500" />
    <Icon name="plus" size="1.5em" stroke-width="1" />

  Available icons: plus, edit, delete, restore, close, file, folder, fileText,
  briefcase, clock, tag, arrowLeft, play, save, settings, users, search, filter, more,
  chevronDown, chevronRight, eye, eyeOff, copy, download, upload, check,
  checkCircle, alertCircle, alertTriangle, info, xCircle, helpCircle, barChart, monitor,
  music, shield, bell, loader, code, sun, moon, menu, logOut, lock, send, zap, refreshCw, externalLink

  Props:
    - name: Icon name from Lucide (required)
    - size: Size of the icon (default: '1em')
    - class: Additional CSS classes
    - strokeWidth: Stroke width (default: 2)
-->
<template>
  <component
    :is="iconComponent"
    :class="computedClasses"
    v-bind="iconProps"
  />
</template>

<script setup>
import { computed, h } from 'vue'
import {
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  X,
  FileText,
  Clock,
  Tag,
  ArrowLeft,
  Play,
  Save,
  Settings,
  Users,
  Folder,
  File,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Download,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  Briefcase,
  BarChart3,
  Monitor,
  Music,
  Shield,
  Bell,
  Loader2,
  Code,
  Sun,
  Moon,
  Menu,
  LogOut,
  Lock,
  Send,
  Zap,
  RefreshCw,
  ExternalLink
} from 'lucide-vue-next'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: '1em'
  },
  class: {
    type: [String, Array, Object],
    default: ''
  },
  strokeWidth: {
    type: [String, Number],
    default: 2
  }
})

// Icon mapping - Add new icons here by importing from lucide-vue-next
const iconMap = {
  // Action icons
  plus: Plus,
  edit: Edit,
  delete: Trash2,
  restore: RotateCcw,
  close: X,

  // Content icons
  file: File,
  folder: Folder,
  fileText: FileText,
  briefcase: Briefcase,

  // Time/Navigation icons
  clock: Clock,
  tag: Tag,
  arrowLeft: ArrowLeft,

  // Control icons
  play: Play,
  save: Save,
  settings: Settings,
  users: Users,
  search: Search,
  filter: Filter,
  more: MoreHorizontal,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,

  // Visibility icons
  eye: Eye,
  eyeOff: EyeOff,

  // File operations
  copy: Copy,
  download: Download,
  upload: Upload,

  // Status icons
  check: Check,
  checkCircle: CheckCircle,
  alertCircle: AlertCircle,
  alertTriangle: AlertTriangle,
  info: Info,
  xCircle: XCircle,
  helpCircle: HelpCircle,

  // Additional icons
  barChart: BarChart3,
  monitor: Monitor,
  music: Music,
  shield: Shield,
  bell: Bell,
  loader: Loader2,
  code: Code,
  sun: Sun,
  moon: Moon,
  menu: Menu,
  logOut: LogOut,
  lock: Lock,
  send: Send,
  zap: Zap,
  refreshCw: RefreshCw,
  externalLink: ExternalLink
}

const iconComponent = computed(() => {
  return iconMap[props.name] || FileText // fallback to FileText if icon not found
})

const computedClasses = computed(() => {
  const baseClasses = []
  const customClasses = Array.isArray(props.class)
    ? props.class
    : typeof props.class === 'string'
    ? props.class.split(' ')
    : []

  return [...baseClasses, ...customClasses]
})

const iconProps = computed(() => ({
  size: props.size,
  strokeWidth: props.strokeWidth
}))
</script>