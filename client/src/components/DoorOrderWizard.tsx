/**
 * DoorOrderWizard — نموذج طلب الباب الاحترافي متعدد الخطوات
 * Design: Architectural Luxury | Oak #2C4A3E + Copper #C4956A + Beige #F5F0E8
 * يقرأ الخيارات ديناميكياً من productOptionsStore
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Upload,
  AlertCircle,
  ShoppingCart,
  Phone,
  Ruler,
  Wrench,
  Truck,
  Star,
  Package,
  MessageSquare,
  Plus,
  Minus,
  Info,
  CheckCircle2,
  LogIn,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useUserAuth } from "@/contexts/UserAuthContext";
import {
  useProductOptions,
  type Section,
  type OptionGroup,
  type OptionValue,
} from "@/stores/productOptionsStore";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import type { PriceTier } from "../lib/productsData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectionMap {
  [groupId: string]: string | boolean | number | string[];
}

interface SubSelectionMap {
  [groupId: string]: { [subId: string]: string | number | string[] };
}

interface DoorOrderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
  basePrice?: number;
  tiers?: PriceTier[];
  quantity?: number;
  productOptions?: Record<string, string[]> | null;
}

// ─── Section Icon Map ─────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ReactNode> = {
  door_type: <Package className="w-5 h-5" />,
  door_color: <span className="text-lg">🎨</span>,
  door_shape: <span className="text-lg">🏛️</span>,
  accessories: <Wrench className="w-5 h-5" />,
  delivery: <Truck className="w-5 h-5" />,
  installation: <Wrench className="w-5 h-5" />,
  extra_services: <Star className="w-5 h-5" />,
  special_requests: <MessageSquare className="w-5 h-5" />,
  dimensions: <Ruler className="w-5 h-5" />,
};

// ─── Helper: calculate total price adjustment ─────────────────────────────────

function calcPriceAdj(
  sections: Section[],
  selections: SelectionMap,
  subSelections: SubSelectionMap
): number {
  let total = 0;
  for (const sec of sections) {
    for (const grp of sec.groups) {
      if (!grp.enabled) continue;
      const sel = selections[grp.id];
      if (grp.type === "toggle" && sel === true) {
        total += grp.priceAdj ?? 0;
      } else if (typeof sel === "string" || Array.isArray(sel)) {
        const selectedIds = Array.isArray(sel)
          ? sel
          : typeof sel === "string"
          ? sel.split(",").filter(Boolean)
          : [];
        for (const selectedId of selectedIds) {
          const val = grp.values.find(v => v.id === selectedId);
          if (val) {
            total += val.priceAdj ?? 0;
            // Sub-options price
            if (val.hasSubOptions && val.subOptions) {
              for (const sub of val.subOptions) {
                const subSel = subSelections[grp.id]?.[sub.id];
                if (sub.values && typeof subSel === "string") {
                  const sv = sub.values.find(v => v.id === subSel);
                  if (sv) total += sv.priceAdj ?? 0;
                }
              }
            }
          }
        }
      }
    }
  }
  return total;
}

// ─── Sub-option renderer ──────────────────────────────────────────────────────

function SubOptionInput({
  sub,
  value,
  onChange,
}: {
  sub: NonNullable<OptionValue["subOptions"]>[number];
  value: string | number | string[] | undefined;
  onChange: (v: string | number) => void;
}) {
  if (sub.type === "chips" && sub.values) {
    return (
      <div className="mt-3 pt-3 border-t border-dashed border-copper/30">
        <p className="text-xs text-gray-500 mb-2">{sub.label}</p>
        <div className="flex flex-wrap gap-2">
          {sub.values
            .filter(v => v.enabled)
            .map(v => (
              <button
                key={v.id}
                onClick={() => onChange(v.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  value === v.id
                    ? "bg-oak text-white border-oak"
                    : "bg-white text-gray-700 border-gray-200 hover:border-oak/50"
                }`}
              >
                {v.label}
                {v.priceAdj ? (
                  <span className="ml-1 text-xs opacity-75">
                    {v.priceAdj > 0 ? `+${v.priceAdj}` : v.priceAdj} ر.س
                  </span>
                ) : null}
              </button>
            ))}
        </div>
      </div>
    );
  }
  if (sub.type === "number_input") {
    return (
      <div className="mt-3 pt-3 border-t border-dashed border-copper/30">
        <p className="text-xs text-gray-500 mb-2">{sub.label}</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={sub.min}
            max={sub.max}
            placeholder={sub.placeholder}
            value={(value as number) ?? ""}
            onChange={e => onChange(Number(e.target.value))}
            className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oak"
          />
          {sub.unit && (
            <span className="text-sm text-gray-500">{sub.unit}</span>
          )}
        </div>
      </div>
    );
  }
  if (sub.type === "file_upload") {
    return (
      <div className="mt-3 pt-3 border-t border-dashed border-copper/30">
        <p className="text-xs text-gray-500 mb-2">{sub.label}</p>
        <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-oak/50 transition-colors w-fit">
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {sub.placeholder ?? "رفع ملف"}
          </span>
          <input
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.pdf,.dwg"
          />
        </label>
      </div>
    );
  }
  return null;
}

// ─── Group renderer ───────────────────────────────────────────────────────────

function GroupRenderer({
  group,
  value,
  subValues,
  onChange,
  onSubChange,
  error,
}: {
  group: OptionGroup;
  value: string | boolean | number | string[] | undefined;
  subValues: { [subId: string]: string | number | string[] } | undefined;
  onChange: (v: string | boolean | number | string[]) => void;
  onSubChange: (subId: string, v: string | number) => void;
  error?: boolean;
}) {
  const enabledValues = group.values.filter(v => v.enabled);

  // ── section_header ───────────────────────────────────────
  if (group.type === "section_header") {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-gray-200" />
        {group.hint && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3 flex-shrink-0" /> {group.hint}
          </p>
        )}
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    );
  }

  // ── checkbox_cards ──────────────────────────────────────────
  if (group.type === "checkbox_cards") {
    const selectedList = Array.isArray(value)
      ? value
      : typeof value === "string"
      ? value.split(",").filter(Boolean)
      : [];

    const handleToggle = (id: string) => {
      let newList: string[];
      if (selectedList.includes(id)) {
        newList = selectedList.filter(x => x !== id);
      } else {
        newList = [...selectedList, id];
      }
      onChange(newList);
    };

    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {enabledValues.map(v => {
            const selected = selectedList.includes(v.id);
            return (
              <motion.button
                key={v.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => handleToggle(v.id)}
                className={`relative p-3 rounded-xl border-2 text-right transition-all ${
                  selected
                    ? "border-oak bg-oak/5 shadow-sm"
                    : "border-gray-200 bg-white hover:border-oak/40"
                }`}
              >
                <span className={`absolute top-2 left-2 w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  selected ? "bg-oak border-oak" : "border-gray-300 bg-white"
                }`}>
                  {selected && <Check className="w-3 h-3 text-white" />}
                </span>
                <p className="font-semibold text-sm text-gray-800 pr-5">{v.label}</p>
                {v.description && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed pr-5">
                    {v.description}
                  </p>
                )}
                {v.priceAdj !== undefined && v.priceAdj !== 0 && (
                  <p
                    className={`text-xs font-bold mt-1 pr-5 ${v.priceAdj > 0 ? "text-copper" : "text-green-600"}`}
                  >
                    {v.priceAdj > 0 ? `+${v.priceAdj}` : v.priceAdj} ر.س
                  </p>
                )}
                {/* Sub-options when selected */}
                {selected && v.hasSubOptions && v.subOptions && (
                  <div onClick={e => e.stopPropagation()} className="mt-2 text-right">
                    {v.subOptions.map(sub => (
                      <SubOptionInput
                        key={sub.id}
                        sub={sub}
                        value={subValues?.[sub.id]}
                        onChange={sv => onSubChange(sub.id, sv)}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
        {error && (
          <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> هذا الحقل مطلوب
          </p>
        )}
      </div>
    );
  }

  // ── radio_cards ──────────────────────────────────────────
  if (group.type === "radio_cards") {
    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {enabledValues.map(v => {
            const selected = value === v.id;
            return (
              <motion.button
                key={v.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onChange(v.id)}
                className={`relative p-3 rounded-xl border-2 text-right transition-all ${
                  selected
                    ? "border-oak bg-oak/5 shadow-sm"
                    : "border-gray-200 bg-white hover:border-oak/40"
                }`}
              >
                {selected && (
                  <span className="absolute top-2 left-2 w-5 h-5 bg-oak rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
                <p className="font-semibold text-sm text-gray-800">{v.label}</p>
                {v.description && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {v.description}
                  </p>
                )}
                {v.priceAdj !== undefined && v.priceAdj !== 0 && (
                  <p
                    className={`text-xs font-bold mt-1 ${v.priceAdj > 0 ? "text-copper" : "text-green-600"}`}
                  >
                    {v.priceAdj > 0 ? `+${v.priceAdj}` : v.priceAdj} ر.س
                  </p>
                )}
                {/* Sub-options when selected */}
                {selected && v.hasSubOptions && v.subOptions && (
                  <div onClick={e => e.stopPropagation()}>
                    {v.subOptions.map(sub => (
                      <SubOptionInput
                        key={sub.id}
                        sub={sub}
                        value={subValues?.[sub.id]}
                        onChange={sv => onSubChange(sub.id, sv)}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
        {error && (
          <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> هذا الحقل مطلوب
          </p>
        )}
      </div>
    );
  }

  // ── color_swatches ───────────────────────────────────────
  if (group.type === "color_swatches") {
    return (
      <div>
        <div className="flex flex-wrap gap-3">
          {enabledValues.map(v => {
            const selected = value === v.id;
            return (
              <motion.button
                key={v.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChange(v.id)}
                title={v.label}
                className={`relative flex flex-col items-center gap-1.5 transition-all`}
              >
                <div
                  className={`w-10 h-10 rounded-full border-4 transition-all ${
                    selected
                      ? "border-oak shadow-lg scale-110"
                      : "border-white shadow-sm hover:scale-105"
                  }`}
                  style={{ backgroundColor: v.hex || "#E0E0E0" }}
                >
                  {v.id === "custom" && (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-red-400 via-yellow-400 to-blue-400 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {selected && v.id !== "custom" && (
                    <div className="w-full h-full rounded-full flex items-center justify-center bg-black/20">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <span
                  className={`text-xs ${selected ? "text-oak font-semibold" : "text-gray-600"}`}
                >
                  {v.label}
                </span>
                {v.priceAdj !== undefined && v.priceAdj !== 0 && (
                  <span className="text-xs text-copper font-bold">
                    +{v.priceAdj}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
        {group.hint && (
          <p className="text-xs text-gray-400 mt-3 flex items-start gap-1">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" /> {group.hint}
          </p>
        )}
        {error && (
          <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> هذا الحقل مطلوب
          </p>
        )}
      </div>
    );
  }

  // ── chips ────────────────────────────────────────────────
  if (group.type === "chips") {
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {enabledValues.map(v => {
            const selected = value === v.id;
            return (
              <motion.button
                key={v.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onChange(v.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                  selected
                    ? "bg-oak text-white border-oak shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:border-oak/50"
                }`}
              >
                {v.label}
                {v.priceAdj !== undefined && v.priceAdj !== 0 && (
                  <span
                    className={`mr-1 text-xs ${selected ? "text-white/80" : "text-copper"}`}
                  >
                    {v.priceAdj > 0 ? `+${v.priceAdj}` : v.priceAdj} ر.س
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
        {error && (
          <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> هذا الحقل مطلوب
          </p>
        )}
      </div>
    );
  }

  // ── toggle ───────────────────────────────────────────────
  if (group.type === "toggle") {
    const isOn = value === true;
    return (
      <div>
        <button
          onClick={() => onChange(!isOn)}
          className={`flex items-center justify-between w-full p-4 rounded-xl border-2 transition-all ${
            isOn
              ? "border-oak bg-oak/5"
              : "border-gray-200 bg-white hover:border-oak/30"
          }`}
        >
          <div className="text-right">
            <p className="font-medium text-sm text-gray-800">
              {isOn ? "مفعّل" : "غير مفعّل"}
            </p>
            {group.hint && (
              <p className="text-xs text-gray-500 mt-0.5">{group.hint}</p>
            )}
            {group.priceAdj !== undefined && group.priceAdj > 0 && (
              <p className="text-xs text-copper font-bold mt-1">
                +{group.priceAdj} ر.س
              </p>
            )}
          </div>
          <div
            className={`w-12 h-6 rounded-full transition-all relative ${isOn ? "bg-oak" : "bg-gray-200"}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isOn ? "right-1" : "left-1"}`}
            />
          </div>
        </button>
      </div>
    );
  }

  // ── number_input ─────────────────────────────────────────
  if (group.type === "number_input") {
    return (
      <div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={group.min}
            max={group.max}
            placeholder={group.placeholder}
            value={(value as number) ?? ""}
            onChange={e => onChange(Number(e.target.value))}
            className={`w-36 px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors ${
              error
                ? "border-red-300 focus:border-red-500"
                : "border-gray-200 focus:border-oak"
            }`}
          />
          {group.unit && (
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
              {group.unit}
            </span>
          )}
          {group.min && group.max && (
            <span className="text-xs text-gray-400">
              ({group.min}–{group.max} {group.unit})
            </span>
          )}
        </div>
        {group.hint && (
          <p className="text-xs text-gray-400 mt-2 flex items-start gap-1">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" /> {group.hint}
          </p>
        )}
        {error && (
          <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> هذا الحقل مطلوب
          </p>
        )}
      </div>
    );
  }

  // ── text_input ───────────────────────────────────────────
  if (group.type === "text_input") {
    return (
      <div>
        <textarea
          placeholder={group.placeholder}
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oak resize-none"
        />
      </div>
    );
  }

  // ── file_upload ──────────────────────────────────────────
  if (group.type === "file_upload") {
    return (
      <div>
        <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-oak/50 transition-colors">
          <Upload className="w-8 h-8 text-gray-300" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              اضغط لرفع ملف أو صورة
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {group.placeholder ?? "JPG, PNG, PDF, DWG"}
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.pdf,.dwg"
          />
        </label>
      </div>
    );
  }

  return null;
}

// ─── Door Diagram SVG ────────────────────────────────────────────────────────

function DoorDiagram({ width, height }: { width: number; height: number }) {
  const svgW = 220;
  const svgH = 300;
  const doorX = 50;
  const doorY = 20;
  const doorW = 120;
  const doorH = 220;
  const frameT = 8;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-[200px] mx-auto"
      aria-label="رسم توضيحي للباب"
    >
      {/* خلفية الجدار */}
      <rect x="0" y="0" width={svgW} height={svgH} fill="#F5F0E8" rx="8" />

      {/* إطار الباب */}
      <rect
        x={doorX - frameT}
        y={doorY - frameT}
        width={doorW + frameT * 2}
        height={doorH + frameT}
        fill="#2C4A3E"
        rx="3"
      />

      {/* لوح الباب */}
      <rect
        x={doorX}
        y={doorY}
        width={doorW}
        height={doorH}
        fill="#C4956A"
        rx="2"
      />

      {/* لوحات الزخرفة */}
      <rect
        x={doorX + 10}
        y={doorY + 15}
        width={doorW - 20}
        height={doorH * 0.38}
        fill="rgba(255,255,255,0.15)"
        rx="2"
      />
      <rect
        x={doorX + 10}
        y={doorY + doorH * 0.45}
        width={doorW - 20}
        height={doorH * 0.48}
        fill="rgba(255,255,255,0.15)"
        rx="2"
      />

      {/* المقبض */}
      <circle
        cx={doorX + doorW - 15}
        cy={doorY + doorH / 2}
        r="4"
        fill="#2C4A3E"
      />
      <rect
        x={doorX + doorW - 17}
        y={doorY + doorH / 2 - 12}
        width="4"
        height="24"
        rx="2"
        fill="#2C4A3E"
      />

      {/* خط الأرضية */}
      <line
        x1="10"
        y1={doorY + doorH}
        x2={svgW - 10}
        y2={doorY + doorH}
        stroke="#2C4A3E"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* رؤوس الأسهم */}
      <defs>
        <marker
          id="dw-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#C4956A" />
        </marker>
        <marker
          id="dw-arrow-rev"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#C4956A" />
        </marker>
      </defs>

      {/* سهم العرض */}
      <line
        x1={doorX}
        y1={doorY + doorH + 20}
        x2={doorX + doorW}
        y2={doorY + doorH + 20}
        stroke="#C4956A"
        strokeWidth="1.5"
        markerStart="url(#dw-arrow-rev)"
        markerEnd="url(#dw-arrow)"
      />
      <text
        x={doorX + doorW / 2}
        y={doorY + doorH + 34}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#C4956A"
        fontFamily="system-ui"
      >
        {width > 0 ? `${width} سم` : "العرض"}
      </text>

      {/* سهم الارتفاع */}
      <line
        x1={doorX + doorW + 20}
        y1={doorY}
        x2={doorX + doorW + 20}
        y2={doorY + doorH}
        stroke="#C4956A"
        strokeWidth="1.5"
        markerStart="url(#dw-arrow-rev)"
        markerEnd="url(#dw-arrow)"
      />
      <text
        x={doorX + doorW + 38}
        y={doorY + doorH / 2 + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#C4956A"
        fontFamily="system-ui"
        transform={`rotate(-90, ${doorX + doorW + 38}, ${doorY + doorH / 2 + 4})`}
      >
        {height > 0 ? `${height} سم` : "الطول"}
      </text>

      {/* تنبيه */}
      <text
        x={svgW / 2}
        y={svgH - 8}
        textAnchor="middle"
        fontSize="9"
        fill="#888"
        fontFamily="system-ui"
      >
        رسم توضيحي — ليس للمقياس
      </text>
    </svg>
  );
}

// ─── Section Step ─────────────────────────────────────────────────────────────

function SectionStep({
  section,
  selections,
  subSelections,
  errors,
  onSelect,
  onSubSelect,
}: {
  section: Section;
  selections: SelectionMap;
  subSelections: SubSelectionMap;
  errors: Set<string>;
  onSelect: (groupId: string, value: string | boolean | number | string[]) => void;
  onSubSelect: (groupId: string, subId: string, value: string | number) => void;
}) {
  // استخراج قيم المقاسات الحالية لعرضها في الرسم التوضيحي
  const doorWidth =
    section.id === "dimensions"
      ? Number(selections["width"] ?? selections["door_leaf_width"] ?? 0)
      : 0;
  const doorHeight =
    section.id === "dimensions"
      ? Number(selections["door_leaf_height"] ?? selections["height"] ?? 0)
      : 0;

  return (
    <motion.div
      key={section.id}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      {/* رسم توضيحي للباب في قسم المقاسات */}
      {section.id === "dimensions" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-[#F5F0E8] to-[#EDE8DE] rounded-2xl p-4 flex flex-col items-center gap-2"
        >
          <p className="text-xs font-semibold text-[#2C4A3E] flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5" /> أدخل المقاسات لتحديث الرسم
          </p>
          <DoorDiagram width={doorWidth} height={doorHeight} />
        </motion.div>
      )}
      {section.groups.map(grp => (
        <div
          key={grp.id}
          className={grp.type === "section_header" ? "" : "space-y-3"}
        >
          {grp.type !== "section_header" && (
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800 text-sm">
                {grp.label}
              </h3>
              {grp.required && (
                <span className="text-red-500 text-xs font-bold">*</span>
              )}
              {!grp.required && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  اختياري
                </span>
              )}
            </div>
          )}
          <GroupRenderer
            group={grp}
            value={selections[grp.id]}
            subValues={subSelections[grp.id]}
            onChange={v => onSelect(grp.id, v)}
            onSubChange={(subId, v) => onSubSelect(grp.id, subId, v)}
            error={errors.has(grp.id)}
          />
        </div>
      ))}
    </motion.div>
  );
}

// ─── Summary Step ─────────────────────────────────────────────────────────────

function SummaryStep({
  sections,
  selections,
  subSelections,
  basePrice,
  priceAdj,
  unitPrice,
  quantity,
}: {
  sections: Section[];
  selections: SelectionMap;
  subSelections: SubSelectionMap;
  basePrice: number;
  priceAdj: number;
  unitPrice: number;
  quantity: number;
}) {
  const total = unitPrice * quantity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Price summary */}
      <div className="bg-gradient-to-br from-oak/5 to-copper/5 border border-oak/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-600 text-sm">سعر الباب الواحد</span>
          <span className="font-semibold">
            {(basePrice + priceAdj).toLocaleString()} ر.س
          </span>
        </div>
        {priceAdj !== 0 && (
          <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
            <span>يشمل إضافات الخيارات</span>
            <span className={priceAdj > 0 ? "text-copper" : "text-green-600"}>
              {priceAdj > 0 ? "+" : ""}
              {priceAdj.toLocaleString()} ر.س
            </span>
          </div>
        )}
        {unitPrice !== (basePrice + priceAdj) && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600 text-sm">سعر الشريحة ({quantity} أبواب)</span>
            <span className="font-semibold text-green-600">
              {unitPrice.toLocaleString()} ر.س
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-600 text-sm">الكمية</span>
          <span className="font-semibold">{quantity} باب</span>
        </div>
        <div className="border-t border-oak/20 pt-3 flex items-center justify-between">
          <span className="font-bold text-gray-800">الإجمالي التقديري</span>
          <span className="text-2xl font-black text-oak">
            {total.toLocaleString()} ر.س
          </span>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>شامل ضريبة القيمة المضافة (15%)</span>
          <span>{(total - Math.round((total / 1.15) * 100) / 100).toLocaleString()} ر.س</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          * جميع الأسعار شاملة ضريبة القيمة المضافة (15%). السعر النهائي يُحدد بعد مراجعة المواصفات
        </p>
      </div>

      {/* Selections summary */}
      <div className="space-y-3">
        {sections.map(sec => {
          const hasSelections = sec.groups.some(g => {
            const v = selections[g.id];
            return v !== undefined && v !== "" && v !== false;
          });
          if (!hasSelections) return null;
          return (
            <div
              key={sec.id}
              className="bg-white border border-gray-100 rounded-xl p-4"
            >
              <h4 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                <span>{sec.icon}</span> {sec.label}
              </h4>
              <div className="space-y-2">
                {sec.groups.map(grp => {
                  const sel = selections[grp.id];
                  if (sel === undefined || sel === "" || sel === false)
                    return null;
                  let displayValue = "";
                  if (grp.type === "toggle") {
                    displayValue = sel === true ? "✅ مفعّل" : "";
                  } else if (grp.type === "number_input") {
                    displayValue = `${sel} ${grp.unit ?? ""}`;
                  } else if (grp.type === "text_input") {
                    displayValue =
                      String(sel).slice(0, 60) +
                      (String(sel).length > 60 ? "..." : "");
                  } else if (Array.isArray(sel)) {
                    displayValue = sel.map(id => grp.values.find(v => v.id === id)?.label ?? id).join("، ");
                  } else if (typeof sel === "string") {
                    if (grp.type === "checkbox_cards" || grp.type === "checkbox_list") {
                      displayValue = sel.split(",").map(id => grp.values.find(v => v.id === id)?.label ?? id).join("، ");
                    } else {
                      const val = grp.values.find(v => v.id === sel);
                      displayValue = val?.label ?? sel;
                    }
                  }
                  if (!displayValue) return null;
                  return (
                    <div
                      key={grp.id}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <span className="text-gray-500">{grp.label}</span>
                      <span className="font-medium text-gray-800 text-left">
                        {displayValue}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DoorOrderWizard({
  isOpen,
  onClose,
  productId = "",
  productName,
  basePrice = 850,
  tiers,
  quantity,
  productOptions,
}: DoorOrderWizardProps) {
  const { user, login, register } = useUserAuth();
  const { enabledSections } = useProductOptions();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  // Filter values within each group based on productOptions
  const filteredSections = enabledSections
    .map(section => ({
      ...section,
      groups: section.groups
        .map((grp: any) => {
          const allowedValueIds = productOptions?.[grp.id];
          if (!allowedValueIds?.length) return grp;
          return {
            ...grp,
            values: (grp.values ?? []).filter((v: any) =>
              allowedValueIds.includes(v.id)
            ),
          };
        })
        .filter((grp: any) => {
          // Keep groups that have at least one value or are not value-based (toggles, number inputs)
          if (
            [
              "toggle",
              "number_input",
              "text_input",
              "file_upload",
              "section_header",
            ].includes(grp.type)
          )
            return true;
          if (!productOptions) return true;
          const allowedValueIds = productOptions[grp.id];
          return !allowedValueIds || allowedValueIds.length > 0;
        }),
    }))
    .filter(section =>
      section.groups.some((grp: any) => grp.type !== "section_header")
    );

  const activeSections =
    filteredSections.length > 0 ? filteredSections : enabledSections;

  const allSteps = [
    ...activeSections,
    {
      id: "__summary__",
      label: "مراجعة الطلب",
      icon: "✅",
      order: 999,
    } as Section & { id: "__summary__" },
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<SelectionMap>({});
  const [subSelections, setSubSelections] = useState<SubSelectionMap>({});
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerErrors, setCustomerErrors] = useState<{
    name?: string;
    phone?: string;
  }>({});

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const handleInlineAuth = async () => {
    setAuthLoading(true);
    try {
      let ok = false;
      if (authMode === "login") {
        if (!authEmail || !authPassword) {
          toast.error("يرجى إدخال البريد وكلمة المرور");
          setAuthLoading(false);
          return;
        }
        ok = await login(authEmail, authPassword);
      } else {
        if (!authName || !authEmail || !authPhone || !authPassword) {
          toast.error("يرجى تعبئة جميع الحقول");
          setAuthLoading(false);
          return;
        }
        ok = await register(authName, authEmail, authPhone, authPassword);
      }
      if (ok) {
        toast.success(authMode === "login" ? "تم تسجيل الدخول" : "تم إنشاء الحساب");
      }
    } catch {
      toast.error("حدث خطأ، يرجى المحاولة مجدداً");
    } finally {
      setAuthLoading(false);
    }
  };
  const contentRef = useRef<HTMLDivElement>(null);

  const createOrder = trpc.orders.create.useMutation();

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setSelections({});
      setSubSelections({});
      setErrors(new Set());
      setSubmitted(false);
      setOrderId(null);
    }
  }, [isOpen]);

  // Scroll to top on step change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const priceAdj = calcPriceAdj(activeSections, selections, subSelections);
  const qty = quantity ?? 1;
  const currentTier =
    tiers?.find(t => qty >= t.min && (t.max === null || qty <= t.max)) ?? tiers?.[0];
  const unitPrice = (currentTier?.price ?? basePrice) + priceAdj;
  const totalPrice = unitPrice * qty;

  const currentSection = allSteps[currentStep];
  const isSummary = currentSection?.id === "__summary__";
  const progress = (currentStep / (allSteps.length - 1)) * 100;

  const handleSelect = useCallback(
    (groupId: string, value: string | boolean | number | string[]) => {
      setSelections(prev => ({ ...prev, [groupId]: value }));
      setErrors(prev => {
        const n = new Set(prev);
        n.delete(groupId);
        return n;
      });
    },
    []
  );

  const handleSubSelect = useCallback(
    (groupId: string, subId: string, value: string | number) => {
      setSubSelections(prev => ({
        ...prev,
        [groupId]: { ...(prev[groupId] ?? {}), [subId]: value },
      }));
    },
    []
  );

  const validateCurrentStep = (): boolean => {
    if (isSummary) return true;
    const section = currentSection as Section;
    const newErrors = new Set<string>();
    for (const grp of section.groups) {
      if (!grp.required) continue;
      const sel = selections[grp.id];
      if (grp.type === "toggle") continue; // toggles are optional by nature
      if (grp.type === "section_header") continue; // section headers have no input
      if (grp.type === "number_input") {
        if (!sel || Number(sel) <= 0) newErrors.add(grp.id);
      } else if (!sel || sel === "" || (Array.isArray(sel) && sel.length === 0)) {
        newErrors.add(grp.id);
      }
    }
    setErrors(newErrors);
    return newErrors.size === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast.error("يرجى تعبئة الحقول الإلزامية");
      return;
    }
    if (currentStep < allSteps.length - 1) {
      setCurrentStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول أولاً لإرسال الطلب");
      return;
    }
    setSubmitting(true);
    try {
      // Serialize all selections as strings (preserves toggles and number inputs)
      const allSelections: Record<string, string> = {};
      for (const [k, v] of Object.entries(selections)) {
        if (v !== undefined && v !== null && v !== "") {
          allSelections[k] = String(v);
        }
      }

      // Extract dimensions: all number_input groups across all sections
      const dims: Record<string, unknown> = {};
      for (const sec of activeSections) {
        for (const grp of sec.groups) {
          if (grp.type === "number_input" && selections[grp.id] !== undefined) {
            dims[grp.id] = selections[grp.id];
          }
        }
      }

      const result = await createOrder.mutateAsync({
        customerName: user?.name ?? "",
        customerPhone: user?.phone ?? "",
        customerEmail: user?.email ?? undefined,
        productId: productId || "unknown",
        productName: productName || "باب سنديان",
        totalDoors: qty,
        selections: allSelections,
        subSelections: subSelections as Record<string, unknown>,
        dimensions: Object.keys(dims).length > 0 ? dims : undefined,
        basePrice: (currentTier?.price ?? basePrice),
        totalPrice,
        notes: String(selections["special_request_text"] ?? ""),
      });
      setSubmitting(false);
      setOrderId(result.id ?? null);
      setSubmitted(true);
      setTimeout(() => {
        toast.success("تم إرسال طلبك بنجاح! سيتواصل معك فريقنا قريباً.");
      }, 100);
    } catch (err) {
      setSubmitting(false);
      console.error("[DoorOrderWizard] Submit error:", err);
      toast.error("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="wizard-overlay"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          dir={isRTL ? "rtl" : "ltr"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            key="wizard-panel"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "95vh" }}
          >
            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex-1">
                <h2 className="font-bold text-gray-800 text-base">
                  {isSummary ? "مراجعة الطلب" : currentSection?.label}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  الخطوة {currentStep + 1} من {allSteps.length}
                </p>
              </div>
              {/* Price badge */}
              <div className="mx-4 text-center">
                <p className="text-xs text-gray-400">الإجمالي</p>
                <p className="text-lg font-black text-oak">
                  {totalPrice.toLocaleString()} ر.س
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* ── Progress Bar ────────────────────────────────── */}
            <div className="px-5 py-2">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-oak to-copper rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              {/* Step dots */}
              <div className="flex justify-between mt-2">
                {allSteps.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => i < currentStep && setCurrentStep(i)}
                    className={`w-6 h-6 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                      i < currentStep
                        ? "bg-oak text-white cursor-pointer hover:bg-oak/80"
                        : i === currentStep
                          ? "bg-copper text-white"
                          : "bg-gray-100 text-gray-400"
                    }`}
                    title={s.label}
                  >
                    {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Content ─────────────────────────────────────── */}
            <div ref={contentRef} className="flex-1 overflow-y-auto px-5 py-4">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      تم استلام طلبك بنجاح!
                    </h3>
                    {orderId && (
                      <p className="text-sm font-medium text-oak mb-3">
                        رقم الطلب:{" "}
                        <span className="font-black">#{orderId}</span>
                      </p>
                    )}
                    <p className="text-gray-500 text-sm mb-2 max-w-xs leading-relaxed">
                      سيتواصل معك فريقنا خلال 24 ساعة لتأكيد الطلب وتفاصيل
                      التسليم.
                    </p>
                    {customerEmail.trim() && (
                      <p className="text-xs text-copper mb-6">
                        📧 تم إرسال تأكيد إلى {customerEmail.trim()}
                      </p>
                    )}
                    <button
                      onClick={onClose}
                      className="px-8 py-3 bg-oak text-white rounded-xl font-bold hover:bg-oak/90 transition-colors"
                    >
                      إغلاق
                    </button>
                  </motion.div>
                ) : isSummary ? (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <SummaryStep
                      sections={activeSections}
                      selections={selections}
                      subSelections={subSelections}
                      basePrice={currentTier?.price ?? basePrice}
                      priceAdj={priceAdj}
                      unitPrice={unitPrice}
                      quantity={qty}
                    />
              {/* Customer Info — تلقائي للعميل المسجّل / دعوة تسجيل للزائر */}
              {user ? null : (
                <div className="mt-4 bg-white border border-oak/20 rounded-xl p-5">
                  <h4 className="font-bold text-gray-800 text-sm mb-1 text-center">
                    {authMode === "login" ? "سجّل الدخول لإتمام الطلب" : "أنشئ حساباً لإتمام الطلب"}
                  </h4>
                  <p className="text-xs text-gray-500 mb-4 text-center">
                    لن تفقد خياراتك — سيُكمَل طلبك بعد الدخول مباشرة.
                  </p>

                  {authMode === "register" && (
                    <input
                      type="text"
                      placeholder="الاسم الكامل"
                      value={authName}
                      onChange={e => setAuthName(e.target.value)}
                      className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-oak"
                    />
                  )}
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-oak"
                  />
                  {authMode === "register" && (
                    <input
                      type="tel"
                      placeholder="رقم الجوال"
                      value={authPhone}
                      onChange={e => setAuthPhone(e.target.value)}
                      className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-oak"
                    />
                  )}
                  <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-oak"
                  />

                  <button
                    type="button"
                    onClick={handleInlineAuth}
                    disabled={authLoading}
                    className="w-full py-2.5 rounded-lg bg-oak text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {authLoading
                      ? "جارٍ..."
                      : authMode === "login"
                      ? "تسجيل الدخول"
                      : "إنشاء حساب"}
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-3">
                    {authMode === "login" ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
                    <button
                      type="button"
                      onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                      className="text-oak font-semibold underline"
                    >
                      {authMode === "login" ? "أنشئ حساباً" : "سجّل الدخول"}
                    </button>
                  </p>
                </div>
              )}
                  </motion.div>
                ) : (
                  <SectionStep
                    key={currentSection?.id}
                    section={currentSection as Section}
                    selections={selections}
                    subSelections={subSelections}
                    errors={errors}
                    onSelect={handleSelect}
                    onSubSelect={handleSubSelect}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ──────────────────────────────────────── */}
            {!submitted && (
              <div className="px-5 pb-5 pt-3 border-t border-gray-100">
                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <button
                      onClick={handleBack}
                      className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-oak/50 transition-colors flex items-center justify-center gap-2"
                    >
                      {isRTL ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronLeft className="w-4 h-4" />
                      )}
                      السابق
                    </button>
                  )}
                  {isSummary ? (
                    <button
                      onClick={handleSubmit}
                      disabled={!user || submitting}
                      className="flex-1 py-3 bg-oak text-white rounded-xl font-bold hover:bg-oak/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          إرسال الطلب
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="flex-1 py-3 bg-oak text-white rounded-xl font-bold hover:bg-oak/90 transition-colors flex items-center justify-center gap-2"
                    >
                      التالي
                      {isRTL ? (
                        <ChevronLeft className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                {/* Contact shortcut */}
                <button className="w-full mt-2 py-2 text-xs text-gray-400 flex items-center justify-center gap-1 hover:text-oak transition-colors">
                  <Phone className="w-3 h-3" />
                  تحتاج مساعدة؟ تواصل معنا مباشرة
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
