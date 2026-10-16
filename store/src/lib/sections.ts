/**
 * The fixed set of website section types (Shopify-style "sections").
 * The same definitions drive both the public renderer and the admin editor.
 * To add a new section type: add it here, add it to the SQL check constraint on
 * page_sections.type, and add a renderer in components/site/SectionRenderer.tsx.
 */
export type FieldType = "text" | "textarea" | "image" | "video" | "select" | "product" | "images";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  help?: string;
}

export interface SectionTypeDef {
  type: string;
  label: string;
  description: string;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
}

const align = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centered" },
];

export const SECTION_TYPES: SectionTypeDef[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Large opening banner with an image or video and up to two buttons.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "image_path", label: "Image", type: "image" },
      { key: "video_path", label: "Video (optional, replaces the image)", type: "video" },
      { key: "button1_label", label: "Button 1 text", type: "text" },
      { key: "button1_href", label: "Button 1 link", type: "text", help: "For example /shop or https://..." },
      { key: "button2_label", label: "Button 2 text", type: "text" },
      { key: "button2_href", label: "Button 2 link", type: "text" },
      { key: "text_align", label: "Text alignment", type: "select", options: align },
    ],
    defaults: { title: "", subtitle: "", image_path: "", video_path: "", button1_label: "", button1_href: "", button2_label: "", button2_href: "", text_align: "left" },
  },
  {
    type: "text",
    label: "Text",
    description: "A heading with a block of text.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Text", type: "textarea", help: "Leave a blank line between paragraphs." },
      { key: "align", label: "Alignment", type: "select", options: align },
    ],
    defaults: { title: "", body: "", align: "left" },
  },
  {
    type: "image",
    label: "Image",
    description: "A single large image with an optional caption.",
    fields: [
      { key: "image_path", label: "Image", type: "image" },
      { key: "alt", label: "Image description (for accessibility)", type: "text" },
      { key: "caption", label: "Caption", type: "text" },
      {
        key: "width",
        label: "Width",
        type: "select",
        options: [
          { value: "full", label: "Full width" },
          { value: "contained", label: "Contained" },
        ],
      },
    ],
    defaults: { image_path: "", alt: "", caption: "", width: "full" },
  },
  {
    type: "image_text",
    label: "Image + text",
    description: "An image next to a heading, text and optional button.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Text", type: "textarea" },
      { key: "image_path", label: "Image", type: "image" },
      { key: "alt", label: "Image description (for accessibility)", type: "text" },
      {
        key: "image_side",
        label: "Image position",
        type: "select",
        options: [
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
      { key: "button_label", label: "Button text", type: "text" },
      { key: "button_href", label: "Button link", type: "text" },
    ],
    defaults: { title: "", body: "", image_path: "", alt: "", image_side: "right", button_label: "", button_href: "" },
  },
  {
    type: "featured_product",
    label: "Featured product",
    description: "Highlights one product. Leave empty to feature the first active product.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Text", type: "textarea" },
      { key: "product_id", label: "Product", type: "product" },
      { key: "button_label", label: "Button text", type: "text" },
    ],
    defaults: { title: "", body: "", product_id: "", button_label: "View product" },
  },
  {
    type: "cta",
    label: "Call to action",
    description: "A bold closing block with one button.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Text", type: "textarea" },
      { key: "button_label", label: "Button text", type: "text" },
      { key: "button_href", label: "Button link", type: "text" },
    ],
    defaults: { title: "", body: "", button_label: "", button_href: "" },
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "A grid of images.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "images", label: "Images", type: "images" },
    ],
    defaults: { title: "", images: [] },
  },
];

export function sectionDef(type: string): SectionTypeDef | undefined {
  return SECTION_TYPES.find((t) => t.type === type);
}
