<script lang="ts">
  /**
   * 全站 SVG 图标统一入口（Lucide）
   *
   * 用法：
   *   <Icon name="sparkles" />
   *   <Icon name="trash-2" size={20} class="text-danger" />
   *
   * 新增图标：先确认 lucide 有这个名（https://lucide.dev/icons），
   * 然后 import 进来加到 MAP，避免 bundle 把整库都打进去。
   */
  import {
    Puzzle, Sparkles, ClipboardList, Map, AlertTriangle, Search, Home,
    User, LogOut, Rocket, BarChart3, Tag, Brain, Target, Bot, Type,
    PenLine, Trash2, Copy, RotateCcw, Plus, Check, X, Save, FileText,
    Trophy, Star, Waves, ChevronRight, ChevronDown, ChevronUp, ChevronLeft,
    Loader2, Mail, Lock, KeyRound, ListChecks, Package, Layers, Link2,
    Eye, EyeOff, ArrowRight, Boxes, AlertCircle, Info, Sun, Moon,
    Sticker, Flame, Crown, ArrowUpRight, MinusCircle, PlusCircle, FilePlus2,
    BadgePlus, Pencil, Filter, RefreshCw,
  } from '@lucide/svelte';

  const MAP = {
    // brand / nav
    'puzzle': Puzzle,
    'sparkles': Sparkles,
    'clipboard-list': ClipboardList,
    'map': Map,
    'alert-triangle': AlertTriangle,
    'search': Search,
    'home': Home,
    'user': User,
    'log-out': LogOut,
    'rocket': Rocket,
    'bar-chart-3': BarChart3,
    'tag': Tag,
    'brain': Brain,
    'target': Target,
    'bot': Bot,
    'type': Type,
    // actions
    'pen-line': PenLine,
    'pencil': Pencil,
    'trash-2': Trash2,
    'copy': Copy,
    'rotate-ccw': RotateCcw,
    'plus': Plus,
    'check': Check,
    'x': X,
    'save': Save,
    'file-text': FileText,
    'badge-plus': BadgePlus,
    'file-plus-2': FilePlus2,
    'refresh-cw': RefreshCw,
    'filter': Filter,
    // domain semantic
    'trophy': Trophy,
    'star': Star,
    'waves': Waves,
    'flame': Flame,
    'crown': Crown,
    'sticker': Sticker,
    // chevrons / arrows
    'chevron-right': ChevronRight,
    'chevron-down': ChevronDown,
    'chevron-up': ChevronUp,
    'chevron-left': ChevronLeft,
    'arrow-right': ArrowRight,
    'arrow-up-right': ArrowUpRight,
    // state
    'loader-2': Loader2,
    'mail': Mail,
    'lock': Lock,
    'key-round': KeyRound,
    'list-checks': ListChecks,
    'package': Package,
    'layers': Layers,
    'link-2': Link2,
    'boxes': Boxes,
    'eye': Eye,
    'eye-off': EyeOff,
    'alert-circle': AlertCircle,
    'info': Info,
    'sun': Sun,
    'moon': Moon,
    'minus-circle': MinusCircle,
    'plus-circle': PlusCircle,
  } as const;

  type IconName = keyof typeof MAP;

  interface Props {
    name: IconName;
    size?: number;
    strokeWidth?: number;
    class?: string;
  }
  let { name, size = 16, strokeWidth = 2, class: klass = '' }: Props = $props();

  const Cmp = $derived(MAP[name]);
</script>

{#if Cmp}
  <Cmp {size} {strokeWidth} class={klass} />
{/if}
