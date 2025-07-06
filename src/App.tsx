import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  KeyboardEvent,
  ChangeEvent,
  FormEvent,
} from "react";
import {
  Bold,
  Italic,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  MoreHorizontal,
  Settings,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Plus,
  Search,
  Image,
  Heading,
  Quote,
  List,
  BarChart3,
  Zap,
  Play,
  Save,
  Eye,
  Code,
  Bot,
  User,
  Menu,
  X,
  ChevronRight,
  Type,
  Palette,
  Layers,
  Camera,
  Upload,
  Globe,
  CheckCircle,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  Sparkles,
  Wand2,
  Move,
  Underline,
  Strikethrough,
  Highlighter,
  RotateCcw,
  FileText,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
  MapPin,
  Calendar,
  Table,
  Minus,
  Hash,
  Archive,
  FileCode,
  Layout,
} from "lucide-react";

// Type declarations for external embed scripts
declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
      };
    };
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

// Enhanced Type Definitions
interface Block {
  id: string;
  type:
    | "paragraph"
    | "heading"
    | "image"
    | "quote"
    | "list"
    | "embed"
    | "table"
    | "divider"
    | "raw-html";
  data: any;
  metadata: {
    created: number;
    wordCount: number;
    readingTime: number;
  };
}

interface AISuggestion {
  id: string;
  type: "generate-text" | "summarize" | "improve-writing" | "generate-image";
  title: string;
  description: string;
  icon: React.ElementType;
}

interface DragState {
  isDragging: boolean;
  draggedBlockId: string | null;
  dragOverIndex: number | null;
  newBlockType?: Block["type"];
}

interface EditableBlockProps {
  block: Block;
  onUpdate: (data: any) => void;
  onEnterKey: (e: KeyboardEvent<HTMLElement>) => void;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  style?: React.CSSProperties;
  "data-placeholder"?: string;
  [key: string]: any;
}

interface BlockComponentProps {
  block: Block;
  onUpdate: (data: any) => void;
  onEnterKey: (e: KeyboardEvent<HTMLElement>) => void;
  editorDirection: "ltr" | "rtl";
}

interface ProductionBlockRendererProps {
  block: Block;
  index: number;
  isSelected: boolean;
  editorDirection: "ltr" | "rtl";
  onSelect: () => void;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToolbarToggle: (tier: "tier1" | "tier2") => void;
  activeToolbar: "tier1" | "tier2";
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onEnterKey: (e: KeyboardEvent<HTMLElement>) => void;
  editingHtml: boolean;
  onToggleHtmlEdit: () => void;
  onOpenLinkModal: () => void;
}

// Main Editor Component
const UltimateNewsEditor: React.FC = () => {
  // Core State Management
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: "block-1",
      type: "paragraph",
      data: { html: "" },
      metadata: { created: Date.now(), wordCount: 0, readingTime: 0 },
    },
  ]);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(true);
  const [activeToolbar, setActiveToolbar] = useState<"tier1" | "tier2">(
    "tier1"
  );
  const [editingHtml, setEditingHtml] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [linkData, setLinkData] = useState<{
    text: string;
    url: string;
    range: Range | null;
  }>({ text: "", url: "", range: null });
  const [editorDirection, setEditorDirection] = useState<"ltr" | "rtl">("ltr");

  // Drag and Drop State
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedBlockId: null,
    dragOverIndex: null,
  });

  // Refs for managing focus
  const blockRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const editorRef = useRef<HTMLDivElement>(null);

  // Block Management Functions
  const addBlock = useCallback(
    (type: Block["type"], atIndex: number, data?: any) => {
      const newBlock: Block = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data: data || getDefaultBlockData(type),
        metadata: { created: Date.now(), wordCount: 0, readingTime: 0 },
      };

      setBlocks((prev) => {
        const newBlocks = [...prev];
        newBlocks.splice(atIndex, 0, newBlock);
        return newBlocks;
      });

      setSelectedBlockId(newBlock.id);

      setTimeout(() => {
        const newBlockElement = blockRefs.current[newBlock.id];
        if (newBlockElement) {
          const editableElement = newBlockElement.querySelector(
            '[contenteditable="true"], input, textarea'
          ) as HTMLElement;
          if (editableElement) editableElement.focus();
        }
      }, 50);
      return newBlock.id;
    },
    []
  );

  const updateBlock = useCallback((blockId: string, data: any) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              data: { ...block.data, ...data },
              metadata: {
                ...block.metadata,
                wordCount: getWordCount(data.html || data.text || ""),
                readingTime: Math.ceil(
                  getWordCount(data.html || data.text || "") / 200
                ),
              },
            }
          : block
      )
    );
  }, []);

  const deleteBlock = useCallback(
    (blockId: string) => {
      const blockIndex = blocks.findIndex((block) => block.id === blockId);
      if (blockIndex === -1) return;

      // If this is the only block, replace it with a fresh empty paragraph block
      if (blocks.length === 1) {
        const newEmptyBlock: Block = {
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "paragraph",
          data: { html: "" },
          metadata: { created: Date.now(), wordCount: 0, readingTime: 0 },
        };
        setBlocks([newEmptyBlock]);
        setSelectedBlockId(newEmptyBlock.id);
        return;
      }

      const newBlocks = blocks.filter((b) => b.id !== blockId);

      let nextSelectedId: string | null = null;
      if (newBlocks.length > 0) {
        const newIndex = Math.max(0, blockIndex - 1);
        nextSelectedId = newBlocks[newIndex]?.id || newBlocks[0]?.id;
      }

      setBlocks(newBlocks);
      setSelectedBlockId(nextSelectedId);
    },
    [blocks]
  );

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    setBlocks((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }, []);

  const handleEnterKey = useCallback(
    (blockId: string, e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter") {
        if (e.shiftKey) {
          return;
        }
        e.preventDefault();
        const blockIndex = blocks.findIndex((block) => block.id === blockId);
        if (blockIndex !== -1) {
          addBlock("paragraph", blockIndex + 1);
        }
      }
    },
    [addBlock, blocks]
  );

  // Drag and Drop Handlers
  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", blockId);
    setDragState({
      isDragging: true,
      draggedBlockId: blockId,
      dragOverIndex: null,
    });
  }, []);

  const handleSidebarDragStart = useCallback(
    (e: React.DragEvent, type: Block["type"]) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/new-block-type", type);
      setDragState({
        isDragging: true,
        draggedBlockId: null,
        dragOverIndex: null,
        newBlockType: type,
      });
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (targetIndex !== dragState.dragOverIndex) {
        setDragState((prev) => ({ ...prev, dragOverIndex: targetIndex }));
      }
    },
    [dragState.dragOverIndex]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      const newBlockType = e.dataTransfer.getData(
        "text/new-block-type"
      ) as Block["type"];
      const draggedBlockId = e.dataTransfer.getData("text/plain");

      if (newBlockType) {
        addBlock(newBlockType, targetIndex);
      } else if (draggedBlockId) {
        const fromIndex = blocks.findIndex(
          (block) => block.id === draggedBlockId
        );
        if (fromIndex !== -1) {
          moveBlock(fromIndex, targetIndex);
        }
      }

      setDragState({
        isDragging: false,
        draggedBlockId: null,
        dragOverIndex: null,
      });
    },
    [blocks, moveBlock, addBlock]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedBlockId: null,
      dragOverIndex: null,
    });
  }, []);

  // Link Modal Logic
  const openLinkModal = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const text = selection.toString();
    const parent = range.startContainer.parentElement?.closest("a");
    const existingUrl = parent?.getAttribute("href") || "";
    setLinkData({ text, url: existingUrl, range });
    setIsLinkModalOpen(true);
  };

  const handleApplyLink = (url: string, text: string) => {
    const { range } = linkData;
    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      if (range.collapsed) {
        document.execCommand(
          "insertHTML",
          false,
          `<a href="${url}" target="_blank">${text}</a>`
        );
      } else {
        document.execCommand("createLink", false, url);
        const parentAnchor = range.startContainer.parentElement?.closest("a");
        if (parentAnchor) parentAnchor.setAttribute("target", "_blank");
      }
    }
    setIsLinkModalOpen(false);
  };

  // Effect to handle clicks outside of blocks to deselect them
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        editorRef.current &&
        !editorRef.current.contains(event.target as Node)
      ) {
        setSelectedBlockId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();

      // Get both HTML and plain text
      const htmlData = e.clipboardData.getData("text/html");
      const plainText = e.clipboardData.getData("text/plain");

      if (htmlData && htmlData.trim()) {
        // Comprehensive HTML cleaning for professional results
        const cleanHtml = htmlData
          // Remove Microsoft Office conditional comments and fragments
          .replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, "")
          .replace(/<!--StartFragment-->/gi, "")
          .replace(/<!--EndFragment-->/gi, "")
          .replace(/<!--[\s\S]*?-->/gi, "")

          // Remove Microsoft Word and Office junk
          .replace(/<meta[^>]*>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<link[^>]*>/gi, "")
          .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, "")
          .replace(/<o:p[^>]*>/gi, "")
          .replace(/<\/o:p>/gi, "")
          .replace(/<xml[^>]*>[\s\S]*?<\/xml>/gi, "")
          .replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, "")
          .replace(/<w:[^>]*>/gi, "")

          // Remove all style, class, and other attributes except href for links
          .replace(/\s+style="[^"]*"/gi, "")
          .replace(/\s+class="[^"]*"/gi, "")
          .replace(/\s+id="[^"]*"/gi, "")
          .replace(/\s+lang="[^"]*"/gi, "")
          .replace(/\s+dir="[^"]*"/gi, "")
          .replace(/\s+data-[^=]*="[^"]*"/gi, "")

          // Remove unnecessary spans and divs but keep their content
          .replace(/<span[^>]*>/gi, "")
          .replace(/<\/span>/gi, "")

          // Normalize structure - convert divs to paragraphs
          .replace(/<div[^>]*>/gi, "<p>")
          .replace(/<\/div>/gi, "</p>")
          .replace(/<p[^>]*>/gi, "<p>")

          // Clean up headings to standard h3
          .replace(/<h[1-6][^>]*>/gi, "<h3>")
          .replace(/<\/h[1-6]>/gi, "</h3>")

          // Remove empty paragraphs and normalize whitespace
          .replace(/<p><\/p>/gi, "")
          .replace(/<p>\s*<\/p>/gi, "")
          .replace(/&nbsp;/gi, " ")
          .replace(/\s+/g, " ")
          .trim();

        // Split into paragraphs to check if it's multi-paragraph content
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = cleanHtml;

        const paragraphs: string[] = [];

        // Check if we have multiple paragraph-level elements
        if (tempDiv.children.length > 1) {
          for (let i = 0; i < tempDiv.children.length; i++) {
            const el = tempDiv.children[i];
            if (
              (el.tagName === "P" || el.tagName === "H3") &&
              el.innerHTML.trim()
            ) {
              paragraphs.push(el.innerHTML.trim());
            }
          }
        }

        // If we have multiple paragraphs, handle multi-block creation
        if (paragraphs.length > 1) {
          const currentBlockIndex = blocks.findIndex(
            (b) => b.id === selectedBlockId
          );
          if (currentBlockIndex === -1) return;

          // Insert first paragraph at cursor position in current block
          document.execCommand("insertHTML", false, paragraphs[0]);

          // Add new blocks for remaining paragraphs AFTER the current block
          let lastAddedBlockId = selectedBlockId;
          setBlocks((currentBlocks) => {
            let newBlocks = [...currentBlocks];
            let insertIndex = currentBlockIndex + 1;
            for (let i = 1; i < paragraphs.length; i++) {
              const newBlock = {
                id: `block-${Date.now()}-${i}`,
                type: "paragraph" as const,
                data: { html: paragraphs[i] },
                metadata: { created: Date.now(), wordCount: 0, readingTime: 0 },
              };
              newBlocks.splice(insertIndex, 0, newBlock);
              lastAddedBlockId = newBlock.id;
              insertIndex++;
            }
            return newBlocks;
          });
          setTimeout(() => setSelectedBlockId(lastAddedBlockId), 0);
          return;
        }

        // Single paragraph or inline content - paste at cursor position
        // Get the actual content without paragraph wrapper
        let contentToPaste = cleanHtml;
        if (
          tempDiv.children.length === 1 &&
          tempDiv.children[0].tagName === "P"
        ) {
          contentToPaste = tempDiv.children[0].innerHTML.trim();
        } else if (tempDiv.children.length === 0) {
          // Direct content without wrapper tags
          contentToPaste = tempDiv.innerHTML.trim();
        }

        // Use browser's insertHTML to paste at cursor position with formatting
        document.execCommand("insertHTML", false, contentToPaste);
        return;
      }

      // Handle plain text paste
      if (plainText && plainText.trim()) {
        // Check if it's multi-line plain text
        const lines = plainText
          .split(/\r?\n/)
          .filter((line) => line.trim() !== "");

        if (lines.length > 1) {
          // Multi-paragraph plain text - create multiple blocks
          const currentBlockIndex = blocks.findIndex(
            (b) => b.id === selectedBlockId
          );
          if (currentBlockIndex === -1) return;

          // Insert first line at cursor position in current block
          document.execCommand("insertText", false, lines[0]);

          // Add new blocks for remaining lines
          let lastAddedBlockId = selectedBlockId;
          setBlocks((currentBlocks) => {
            let newBlocks = [...currentBlocks];
            let insertIndex = currentBlockIndex + 1;
            for (let i = 1; i < lines.length; i++) {
              const newBlock = {
                id: `block-${Date.now()}-${i}`,
                type: "paragraph" as const,
                data: { html: lines[i] },
                metadata: { created: Date.now(), wordCount: 0, readingTime: 0 },
              };
              newBlocks.splice(insertIndex, 0, newBlock);
              lastAddedBlockId = newBlock.id;
              insertIndex++;
            }
            return newBlocks;
          });
          setTimeout(() => setSelectedBlockId(lastAddedBlockId), 0);
        } else {
          // Single line - paste at cursor position
          document.execCommand("insertText", false, plainText);
        }
      }
    },
    [blocks, selectedBlockId, updateBlock]
  );

  return (
    <div className="editor-root">
      <LinkEditorModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSubmit={handleApplyLink}
        initialData={linkData}
      />
      <JsonOutputModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        blocks={blocks}
      />

      <div className="editor-layout">
        <EnhancedSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onDragStart={handleSidebarDragStart}
        />
        <div
          className="editor-main-column"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, blocks.length)}
        >
          <div className="editor-scroll-area">
            <div
              className="editor-paper"
              ref={editorRef}
              onPaste={handlePaste}
              dir={editorDirection}
            >
              <div
                className="editor-controls"
                style={{ justifyContent: "flex-start" }}
              >
                <button
                  onClick={() =>
                    setEditorDirection((prev) =>
                      prev === "ltr" ? "rtl" : "ltr"
                    )
                  }
                  className="control-button"
                >
                  <Globe size={16} />
                  <span style={{ marginInlineStart: "0.5rem" }}>
                    {editorDirection.toUpperCase()}
                  </span>
                </button>
                <button
                  onClick={() => setIsJsonModalOpen(true)}
                  className="control-button"
                >
                  <Code size={16} />
                  <span style={{ marginInlineStart: "0.5rem" }}>Show JSON</span>
                </button>
              </div>
              <div className="block-list-container">
                {blocks.length > 0 ? (
                  blocks.map((block, index) => (
                    <div
                      className={`block-wrapper ${
                        dragState.draggedBlockId === block.id
                          ? "dragging-state"
                          : ""
                      }`}
                      key={block.id}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <BlockInserter
                        onAddBlock={(type) => addBlock(type, index)}
                      />
                      {dragState.isDragging &&
                        dragState.dragOverIndex === index && (
                          <div className="drop-indicator" />
                        )}
                      <ProductionBlockRenderer
                        block={block}
                        index={index}
                        isSelected={selectedBlockId === block.id}
                        editorDirection={editorDirection}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onUpdate={(data) => updateBlock(block.id, data)}
                        onDelete={() => deleteBlock(block.id)}
                        onDuplicate={() =>
                          addBlock(block.type, index, block.data)
                        }
                        onToolbarToggle={(tier) => setActiveToolbar(tier)}
                        activeToolbar={activeToolbar}
                        onDragStart={(e) => handleDragStart(e, block.id)}
                        onDragEnd={handleDragEnd}
                        onEnterKey={(e) => handleEnterKey(block.id, e)}
                        editingHtml={editingHtml === block.id}
                        onToggleHtmlEdit={() =>
                          setEditingHtml(
                            editingHtml === block.id ? null : block.id
                          )
                        }
                        onOpenLinkModal={openLinkModal}
                        ref={(el: HTMLDivElement | null) => {
                          blockRefs.current[block.id] = el;
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className="empty-editor-placeholder">
                    <p>Editor is empty.</p>
                    <button
                      onClick={() => addBlock("paragraph", 0)}
                      className="button button-primary"
                    >
                      Add a new block
                    </button>
                  </div>
                )}
                {blocks.length > 0 &&
                  dragState.isDragging &&
                  dragState.dragOverIndex === blocks.length && (
                    <div className="drop-indicator" />
                  )}
                {blocks.length > 0 && (
                  <div className="end-of-doc-inserter">
                    <BlockInserter
                      onAddBlock={(type) => addBlock(type, blocks.length)}
                      isEndOfDoc={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <AIAssistant
          open={aiAssistantOpen}
          onToggle={() => setAiAssistantOpen(!aiAssistantOpen)}
          addBlock={addBlock}
          updateBlock={updateBlock}
          selectedBlock={blocks.find((b) => b.id === selectedBlockId)}
        />
      </div>
    </div>
  );
};

// Sidebar Components
const EnhancedSidebar: React.FC<{
  collapsed: boolean;
  onToggle: () => void;
  onDragStart: (e: React.DragEvent, type: Block["type"]) => void;
}> = ({ collapsed, onToggle, onDragStart }) => {
  const blockTypes = [
    { type: "paragraph", icon: Type, label: "Paragraph" },
    { type: "heading", icon: Heading, label: "Heading" },
    { type: "image", icon: Image, label: "Image" },
    { type: "embed", icon: Globe, label: "Embed" },
  ];
  if (collapsed) {
    return (
      <div
        style={{
          width: "4rem",
          backgroundColor: "#fff",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "1rem 0",
          gap: "1rem",
          transition: "width 0.3s ease",
        }}
      >
        <button
          onClick={onToggle}
          style={{
            padding: "0.5rem",
            borderRadius: "0.5rem",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Menu size={20} />
        </button>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {blockTypes.map((block) => (
            <div key={block.type} title={`Add ${block.label}`}>
              <button
                draggable
                onDragStart={(e) => onDragStart(e, block.type as Block["type"])}
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f9fafb",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                  cursor: "grab",
                }}
              >
                <block.icon size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        width: "20rem",
        backgroundColor: "#fff",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s ease",
      }}
    >
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ fontWeight: 600, color: "#1f2937" }}>Block Library</h3>
        <button
          onClick={onToggle}
          style={{
            padding: "0.25rem",
            borderRadius: "0.25rem",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <ComprehensiveBlockLibrary onDragStart={onDragStart} />
      </div>
    </div>
  );
};

const ComprehensiveBlockLibrary: React.FC<{
  onDragStart: (e: React.DragEvent, type: Block["type"]) => void;
}> = ({ onDragStart }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const allSections = [
    {
      title: "Common",
      blocks: [
        {
          type: "paragraph",
          label: "Paragraph",
          icon: Type,
          description: "Basic text content",
        },
        {
          type: "heading",
          label: "Heading",
          icon: Heading,
          description: "Section headings (H3-H4)",
        },
        {
          type: "image",
          label: "Image",
          icon: Image,
          description: "Upload or embed images",
        },
        {
          type: "list",
          label: "List",
          icon: List,
          description: "Ordered and unordered lists",
        },
      ],
      alwaysShow: true,
    },
    {
      title: "Text",
      blocks: [
        {
          type: "quote",
          label: "Quote",
          icon: Quote,
          description: "Blockquote with citation",
        },
      ],
    },
    {
      title: "Media",
      blocks: [
        {
          type: "embed",
          label: "Embed",
          icon: Globe,
          description: "YouTube, Twitter, Instagram, Threads",
        },
      ],
    },
    {
      title: "Structure",
      blocks: [
        {
          type: "table",
          label: "Table",
          icon: Table,
          description: "Data tables",
        },
        {
          type: "divider",
          label: "Divider",
          icon: Minus,
          description: "Horizontal separator",
        },
      ],
    },
    {
      title: "Advanced",
      blocks: [
        {
          type: "raw-html",
          label: "Raw HTML",
          icon: Code,
          description: "Custom HTML code",
        },
      ],
    },
  ];
  const filteredSections = allSections
    .map((section) => ({
      ...section,
      blocks: section.blocks.filter(
        (block) =>
          block.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          block.description.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((section) => section.alwaysShow || section.blocks.length > 0);
  return (
    <div
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div style={{ position: "relative" }}>
        <Search
          style={{
            position: "absolute",
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            width: "1rem",
            height: "1rem",
            color: "#9ca3af",
          }}
        />
        <input
          type="text"
          placeholder="Search blocks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: "2.5rem" }}
        />
      </div>
      {filteredSections.map((section) => (
        <div key={section.title}>
          <h4
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#374151",
              marginBottom: "0.75rem",
            }}
          >
            {section.title}
          </h4>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {section.blocks.map((block) => (
              <button
                key={block.type}
                draggable
                onDragStart={(e) => onDragStart(e, block.type as Block["type"])}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  textAlign: "left",
                  cursor: "grab",
                  background: "white",
                }}
              >
                <block.icon
                  style={{
                    width: "1.25rem",
                    height: "1.25rem",
                    color: "#4b5563",
                    marginTop: "0.125rem",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    {block.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginTop: "0.125rem",
                    }}
                  >
                    {block.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Block Renderer & Toolbar
const ProductionBlockRenderer = React.memo(
  React.forwardRef<HTMLDivElement, ProductionBlockRendererProps>(
    (
      {
        block,
        isSelected,
        onSelect,
        onUpdate,
        onDelete,
        onDuplicate,
        onToolbarToggle,
        activeToolbar,
        onDragStart,
        onDragEnd,
        onEnterKey,
        editingHtml,
        onToggleHtmlEdit,
        onOpenLinkModal,
        editorDirection,
      },
      ref
    ) => {
      return (
        <div ref={ref} className="block-wrapper" onClick={onSelect}>
          {isSelected && (
            <ProductionToolbar
              block={block}
              onToggle={onToolbarToggle}
              activeToolbar={activeToolbar}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onUpdate={onUpdate}
              onToggleHtmlEdit={onToggleHtmlEdit}
              editingHtml={editingHtml}
              onOpenLinkModal={onOpenLinkModal}
              editorDirection={editorDirection}
            />
          )}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              padding: "0.25rem",
            }}
          >
            <button
              draggable
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              className="drag-handle"
            >
              <div title="Drag to reorder">
                <GripVertical size={16} />
              </div>
            </button>
            <div
              className={`block-content-area ${isSelected ? "selected" : ""}`}
            >
              {editingHtml ? (
                <ProductionHtmlEditor
                  block={block}
                  onUpdate={onUpdate}
                  onSave={onToggleHtmlEdit}
                />
              ) : (
                <>
                  {block.type === "paragraph" && (
                    <ProductionParagraphBlock
                      block={block}
                      onUpdate={onUpdate}
                      onEnterKey={onEnterKey}
                      editorDirection={editorDirection}
                    />
                  )}
                  {block.type === "heading" && (
                    <ProductionHeadingBlock
                      block={block}
                      onUpdate={onUpdate}
                      onEnterKey={onEnterKey}
                      editorDirection={editorDirection}
                    />
                  )}
                  {block.type === "image" && (
                    <ImageBlock block={block} onUpdate={onUpdate} />
                  )}
                  {block.type === "quote" && (
                    <QuoteBlock
                      block={block}
                      onUpdate={onUpdate}
                      onEnterKey={onEnterKey}
                      editorDirection={editorDirection}
                    />
                  )}
                  {block.type === "divider" && <DividerBlock />}
                  {block.type === "embed" && (
                    <EmbedBlock block={block} onUpdate={onUpdate} />
                  )}
                  {block.type === "list" && (
                    <ListBlock
                      block={block}
                      onUpdate={onUpdate}
                      onEnterKey={onEnterKey}
                      editorDirection={editorDirection}
                    />
                  )}
                  {block.type === "table" && (
                    <TableBlock
                      block={block}
                      onUpdate={onUpdate}
                      onEnterKey={onEnterKey}
                      editorDirection={editorDirection}
                    />
                  )}
                  {block.type === "raw-html" && (
                    <RawHtmlBlock block={block} onUpdate={onUpdate} />
                  )}
                </>
              )}
            </div>
          </div>

          <style>{`
                /* Base & Layout */
                .editor-root { min-height: 100vh; background-color: #f9fafb; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; }
                .editor-layout { flex: 1; display: flex; overflow: hidden; }
                .editor-main-column { flex: 1; display: flex; flex-direction: column; }
                .editor-scroll-area { flex: 1; overflow-y: auto; padding: 1.5rem 3rem; }
                .editor-paper { max-width: 896px; margin: 0 auto; background-color: #fff; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); }

                /* Controls */
                .editor-controls { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
                .control-button { display: inline-flex; align-items: center; font-size: 0.875rem; color: #4b5563; padding: 0.5rem; border-radius: 0.375rem; border: 1px solid #d1d5db; background-color: white; cursor: pointer; transition: background-color 0.2s; }
                .control-button:hover { background-color: #f3f4f6; }

                /* Block Wrapper & Drag/Drop */
                .block-list-container { display: flex; flex-direction: column; }
                .block-wrapper { position: relative; }
                .dragging-state { opacity: 0.4; background: #e0f2fe; border-radius: 8px; }
                .drop-indicator { height: 0.25rem; background-color: #3b82f6; border-radius: 9999px; margin: 0.5rem 0; }
                .drag-handle { flex-shrink: 0; width: 1.5rem; height: 1.5rem; display: flex; align-items: center; justify-content: center; color: #9ca3af; cursor: grab; opacity: 0; transition: opacity 0.2s; margin-top: 0.25rem; background: none; border: none; }
                .block-wrapper:hover .drag-handle { opacity: 1; }
                .drag-handle:active { cursor: grabbing; }

                /* Block Content Area */
                .block-content-area { flex: 1; padding: 0.5rem; border: 2px solid transparent; border-radius: 0.5rem; transition: border-color 0.2s ease-in-out, background-color 0.2s ease-in-out; }
                .block-wrapper:hover .block-content-area:not(.selected) { border-color: #93c5fd; }
                .block-content-area.selected { border-color: #3b82f6; background-color: #eff6ff; }

                /* Block Inserter */
                .block-wrapper:hover .block-inserter-button { opacity: 1; }
                .block-inserter-button { position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); top: 0; width: 1.75rem; height: 1.75rem; display: flex; align-items: center; justify-content: center; background-color: white; border: 1px solid #d1d5db; border-radius: 9999px; transition: all 0.2s; z-index: 10; opacity: 0; cursor: pointer; }
                .block-inserter-button:hover { background-color: #3b82f6; color: white; }
                .block-inserter-button.end-of-doc { opacity: 1; position: static; transform: none; }
                .end-of-doc-inserter { display: flex; justify-content: center; margin-top: 1rem; }

                /* Empty State & Placeholder */
                .empty-editor-placeholder { text-align: center; padding: 3rem 0; }
                .empty-editor-placeholder p { color: #6b7280; margin-bottom: 1rem; }
                [data-placeholder]:empty:before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; display: block; }

                /* General Buttons */
                .button { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; border: 1px solid transparent; cursor: pointer; transition: background-color 0.2s; }
                .button-primary { background-color: #2563eb; color: white; }
                .button-primary:hover { background-color: #1d4ed8; }
                .button-secondary { background-color: #e5e7eb; color: #374151; }
                .button-secondary:hover { background-color: #d1d5db; }
                
                /* Toolbar */
                .toolbar-button { padding: 0.5rem; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .toolbar-button:hover { background-color: #f3f4f6; }
                .toolbar-button.active { background-color: #dbeafe; color: #2563eb; }

                /* Modals */
                .modal-overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
                .modal-dialog { background-color: white; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); padding: 1.5rem; width: 100%; display: flex; flex-direction: column; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .modal-title { font-size: 1.125rem; font-weight: 500; color: #111827; }
                .modal-close-button { padding: 0.25rem; border-radius: 9999px; background: none; border: none; cursor: pointer; }
                .modal-close-button:hover { background-color: #e5e7eb; }
                .modal-body { display: flex; flex-direction: column; gap: 1rem; }
                .modal-footer { margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; }
                .form-input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 1rem; }
                .form-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4); }
                
                /* Embed Preview */
                .embed-preview-wrapper:hover .embed-edit-button { opacity: 1; }
            `}</style>
        </div>
      );
    }
  )
);

const ProductionToolbar: React.FC<{
  block: Block;
  onToggle: (tier: "tier1" | "tier2") => void;
  activeToolbar: "tier1" | "tier2";
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (data: any) => void;
  onToggleHtmlEdit: () => void;
  editingHtml: boolean;
  onOpenLinkModal: () => void;
  editorDirection: "ltr" | "rtl";
}> = ({
  block,
  onToggle,
  activeToolbar,
  onDelete,
  onDuplicate,
  onUpdate,
  onToggleHtmlEdit,
  editingHtml,
  onOpenLinkModal,
  editorDirection,
}) => {
  const [colorPicker, setColorPicker] = useState<{
    visible: boolean;
    type: "foreColor" | "hiliteColor";
    target: HTMLElement | null;
  }>({ visible: false, type: "foreColor", target: null });
  const [activeFormats, setActiveFormats] = useState(new Set());

  // Simple format detection when toolbar is shown (only when text is selected)
  useEffect(() => {
    const updateFormats = () => {
      const commands = ["bold", "italic", "underline", "strikeThrough"];
      const newActiveFormats = new Set();

      commands.forEach((command) => {
        if (document.queryCommandState(command)) {
          newActiveFormats.add(command);
        }
      });

      setActiveFormats(newActiveFormats);
    };

    // Update formats when toolbar appears
    updateFormats();

    // Listen for format changes
    document.addEventListener("selectionchange", updateFormats);

    return () => {
      document.removeEventListener("selectionchange", updateFormats);
    };
  }, []);

  const applyFormat = useCallback((command: string, value?: string) => {
    // Simple formatting - just use execCommand since we know there's a selection
    document.execCommand(command, false, value);

    // Update active formats immediately
    setTimeout(() => {
      const commands = ["bold", "italic", "underline", "strikeThrough"];
      const newActiveFormats = new Set();

      commands.forEach((cmd) => {
        if (document.queryCommandState(cmd)) {
          newActiveFormats.add(cmd);
        }
      });

      setActiveFormats(newActiveFormats);
    }, 0);
  }, []);

  const handleColorClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    type: "foreColor" | "hiliteColor"
  ) => {
    setColorPicker({
      visible: !colorPicker.visible,
      type,
      target: e.currentTarget,
    });
  };

  const handleColorSelect = (color: string) => {
    applyFormat(colorPicker.type, color);
    setColorPicker({ ...colorPicker, visible: false });
  };

  const isParagraph = block.type === "paragraph";
  const isHtmlEditable = ["paragraph", "heading", "quote", "raw-html"].includes(
    block.type
  );

  return (
    <div
      style={{
        position: "absolute",
        top: "-3rem",
        left: "2rem",
        zIndex: 20,
        backgroundColor: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        boxShadow:
          "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
      }}
    >
      {isParagraph && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderRight: "1px solid #e5e7eb",
          }}
        >
          <div title="Bold">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("bold")}
              className={`toolbar-button ${
                activeFormats.has("bold") ? "active" : ""
              }`}
            >
              <Bold size={16} />
            </button>
          </div>
          <div title="Italic">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("italic")}
              className={`toolbar-button ${
                activeFormats.has("italic") ? "active" : ""
              }`}
            >
              <Italic size={16} />
            </button>
          </div>
          <div title="Link">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={onOpenLinkModal}
              className="toolbar-button"
            >
              <Link size={16} />
            </button>
          </div>
          <AlignmentDropdown
            currentAlignment={
              block.data.alignment ||
              (editorDirection === "rtl" ? "right" : "left")
            }
            onSelect={(align) => onUpdate({ alignment: align })}
          />
          <div title="More options">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                onToggle(activeToolbar === "tier1" ? "tier2" : "tier1")
              }
              className="toolbar-button"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      )}
      {isParagraph && activeToolbar === "tier2" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderRight: "1px solid #e5e7eb",
          }}
        >
          <div title="Underline">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat("underline")}
              className={`toolbar-button ${
                activeFormats.has("underline") ? "active" : ""
              }`}
            >
              <Underline size={16} />
            </button>
          </div>
          <div title="Highlight">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleColorClick(e, "hiliteColor")}
              className="toolbar-button"
            >
              <Highlighter size={16} />
            </button>
          </div>
          <div title="Text Color">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleColorClick(e, "foreColor")}
              className="toolbar-button"
            >
              <Palette size={16} />
            </button>
          </div>
        </div>
      )}
      {colorPicker.visible && (
        <ColorPicker
          target={colorPicker.target}
          onSelect={handleColorSelect}
          onClose={() => setColorPicker({ ...colorPicker, visible: false })}
        />
      )}
      {isHtmlEditable && (
        <div title="Edit HTML">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleHtmlEdit}
            className={`toolbar-button ${editingHtml ? "active" : ""}`}
          >
            <Code size={16} />
          </button>
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderLeft: "1px solid #e5e7eb",
        }}
      >
        <div title="Duplicate">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onDuplicate}
            className="toolbar-button"
          >
            <Copy size={16} />
          </button>
        </div>
        <div title="Delete">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onDelete}
            className="toolbar-button"
          >
            <Trash2 size={16} style={{ color: "#dc2626" }} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Modals and Popovers
const LinkEditorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, text: string) => void;
  initialData: { text: string; url: string };
}> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  useEffect(() => {
    if (isOpen) {
      setUrl(initialData.url || "https://");
      setText(initialData.text || "");
    }
  }, [isOpen, initialData]);
  if (!isOpen) return null;
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(url, text);
  };
  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: "28rem" }}>
        <div className="modal-header">
          <h3 className="modal-title">Insert/Edit Link</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link Text"
              className="form-input"
            />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL"
              className="form-input"
            />
          </div>
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="button button-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ColorPicker: React.FC<{
  target: HTMLElement | null;
  onSelect: (color: string) => void;
  onClose: () => void;
}> = ({ target, onSelect, onClose }) => {
  const colors = [
    "#000000",
    "#EF4444",
    "#F97316",
    "#EAB308",
    "#22C55E",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#6B7280",
    "#DC2626",
    "#D97706",
    "#CA8A04",
    "#16A34A",
    "#2563EB",
    "#7C3AED",
    "#DB2777",
  ];
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        !target?.contains(event.target as Node)
      )
        onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, target]);
  if (!target) return null;
  return (
    <div
      ref={pickerRef}
      style={{
        position: "absolute",
        top: "100%",
        marginTop: "0.5rem",
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        zIndex: 30,
        padding: "0.5rem",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: "0.25rem",
        }}
      >
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            style={{
              width: "1.5rem",
              height: "1.5rem",
              borderRadius: "9999px",
              border: "1px solid #e5e7eb",
              backgroundColor: color,
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
};

const BlockInserter: React.FC<{
  onAddBlock: (type: Block["type"]) => void;
  isEndOfDoc?: boolean;
}> = ({ onAddBlock, isEndOfDoc }) => {
  const [isOpen, setIsOpen] = useState(false);
  const inserterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: Event) => {
      if (
        inserterRef.current &&
        !inserterRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const quickBlocks = [
    { type: "paragraph", icon: Type, label: "Text" },
    { type: "heading", icon: Heading, label: "Heading" },
    { type: "image", icon: Image, label: "Image" },
    { type: "list", icon: List, label: "List" },
    { type: "quote", icon: Quote, label: "Quote" },
    { type: "embed", icon: Globe, label: "Embed" },
  ];
  return (
    <div
      ref={inserterRef}
      style={{ position: "relative", height: isEndOfDoc ? "auto" : 0 }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`block-inserter-button ${isEndOfDoc ? "end-of-doc" : ""}`}
      >
        <Plus style={{ width: "1rem", height: "1rem" }} />
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            marginTop: "0.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            zIndex: 20,
            width: "18rem",
            padding: "0.5rem",
          }}
        >
          <h4
            style={{
              fontSize: "0.75rem",
              fontWeight: "bold",
              textTransform: "uppercase",
              color: "#6b7280",
              padding: "0 0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            Add Block
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0.25rem",
            }}
          >
            {quickBlocks.map((block) => (
              <button
                key={block.type}
                onClick={() => {
                  onAddBlock(block.type as Block["type"]);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  borderRadius: "0.25rem",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <block.icon
                  style={{
                    width: "1.25rem",
                    height: "1.25rem",
                    color: "#4b5563",
                  }}
                />
                <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                  {block.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AlignmentDropdown: React.FC<{
  currentAlignment: string;
  onSelect: (alignment: "left" | "center" | "right" | "justify") => void;
}> = ({ currentAlignment, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const alignments = [
    { value: "left", icon: AlignLeft, label: "Align Left" },
    { value: "center", icon: AlignCenter, label: "Align Center" },
    { value: "right", icon: AlignRight, label: "Align Right" },
    { value: "justify", icon: AlignJustify, label: "Justify" },
  ];
  const CurrentIcon =
    alignments.find((a) => a.value === currentAlignment)?.icon || AlignLeft;
  return (
    <div style={{ position: "relative" }} onBlur={() => setIsOpen(false)}>
      <div title="Alignment">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setIsOpen(!isOpen)}
          className="toolbar-button"
        >
          <CurrentIcon style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            marginTop: "0.25rem",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            zIndex: 20,
          }}
        >
          {alignments.map((alignment) => {
            const IconComponent = alignment.icon;
            return (
              <button
                key={alignment.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(alignment.value as any);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  textAlign: "left",
                  background:
                    currentAlignment === alignment.value ? "#eff6ff" : "none",
                  color:
                    currentAlignment === alignment.value
                      ? "#2563eb"
                      : "inherit",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <IconComponent style={{ width: "1rem", height: "1rem" }} />
                <span style={{ fontSize: "0.875rem" }}>{alignment.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const JsonOutputModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  blocks: Block[];
}> = ({ isOpen, onClose, blocks }) => {
  if (!isOpen) return null;

  const formatBlockDataForJson = (block: Block) => {
    const { type, data } = block;
    switch (type) {
      case "paragraph":
        return { text: data.html || "" };
      case "heading":
        return { text: data.html || "", level: data.level || 3 };
      case "quote":
        return { text: data.text || "", caption: data.citation || "" };
      case "image":
        return {
          file: { url: data.url || "" },
          caption: data.caption || "",
          withBorder: false,
          withBackground: false,
          stretched: false,
        };
      case "embed":
        return {
          service: data.embedType || "generic",
          source: data.fullUrl || data.url || "",
          embed: data.fullUrl || data.url || "",
          width: 580,
          height: 320,
          caption: "",
          embedId: data.embedId || "",
        };
      case "divider":
        return {};
      case "raw-html":
        return { html: data.html || "" };
      default:
        return data;
    }
  };

  const editorJsData = {
    time: Date.now(),
    blocks: blocks.map((block) => ({
      id: block.id,
      type: block.type,
      data: formatBlockDataForJson(block),
    })),
    version: "2.29.1",
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-dialog"
        style={{ maxWidth: "42rem", maxHeight: "80vh" }}
      >
        <div className="modal-header">
          <h3 className="modal-title">Editor Content (JSON)</h3>
          <button onClick={onClose} className="modal-close-button">
            <X size={20} />
          </button>
        </div>
        <pre
          style={{
            flex: 1,
            backgroundColor: "#111827",
            color: "#6ee7b7",
            padding: "1rem",
            borderRadius: "0.375rem",
            overflow: "auto",
            fontSize: "0.875rem",
          }}
        >
          <code>{JSON.stringify(editorJsData, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
};

// Block Components
const EditableBlock: React.FC<EditableBlockProps> = ({
  block,
  onUpdate,
  onEnterKey,
  className = "",
  as: Component = "div",
  style,
  ...props
}) => {
  const contentRef = useRef<HTMLElement>(null);
  const isComposingRef = useRef(false);
  const lastContentRef = useRef<string>(block.data.html || "");
  const isTypingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInput = useCallback(() => {
    if (isComposingRef.current || !contentRef.current) return;

    isTypingRef.current = true;
    const currentContent = contentRef.current.innerHTML;
    lastContentRef.current = currentContent;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounced update - only update state after user stops typing
    timeoutRef.current = setTimeout(() => {
      onUpdate({ html: currentContent });
      isTypingRef.current = false;
      timeoutRef.current = null;
    }, 300);
  }, [onUpdate]);

  const handleBlur = useCallback(() => {
    if (contentRef.current) {
      // Clear any pending timeout since we're saving immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const currentContent = contentRef.current.innerHTML;
      lastContentRef.current = currentContent;
      onUpdate({ html: currentContent });
      isTypingRef.current = false;
    }
  }, [onUpdate]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    if (contentRef.current) {
      const currentContent = contentRef.current.innerHTML;
      lastContentRef.current = currentContent;
      onUpdate({ html: currentContent });
    }
  }, [onUpdate]);

  // Only update innerHTML when content changes from outside AND user is not typing
  useEffect(() => {
    if (
      contentRef.current &&
      block.data.html !== lastContentRef.current &&
      !isTypingRef.current &&
      !isComposingRef.current &&
      document.activeElement !== contentRef.current
    ) {
      contentRef.current.innerHTML = block.data.html || "";
      lastContentRef.current = block.data.html || "";
    }
  }, [block.data.html]);

  // Initial content setup
  useEffect(() => {
    if (
      contentRef.current &&
      !contentRef.current.innerHTML &&
      block.data.html
    ) {
      contentRef.current.innerHTML = block.data.html;
      lastContentRef.current = block.data.html;
    }
  }, [block.id]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    element.addEventListener("input", handleInput);
    element.addEventListener("blur", handleBlur);
    element.addEventListener("compositionstart", handleCompositionStart);
    element.addEventListener("compositionend", handleCompositionEnd);

    return () => {
      element.removeEventListener("input", handleInput);
      element.removeEventListener("blur", handleBlur);
      element.removeEventListener("compositionstart", handleCompositionStart);
      element.removeEventListener("compositionend", handleCompositionEnd);

      // Clean up timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [handleInput, handleBlur, handleCompositionStart, handleCompositionEnd]);

  const elementProps = {
    ref: contentRef,
    contentEditable: true,
    suppressContentEditableWarning: true,
    className,
    style: { ...style, outline: "none" },
    onKeyDown: onEnterKey,
    "data-block-id": block.id,
    ...props,
  };

  return React.createElement(Component, elementProps);
};

const ProductionParagraphBlock: React.FC<BlockComponentProps> = ({
  block,
  onUpdate,
  onEnterKey,
  editorDirection,
}) => (
  <EditableBlock
    block={block}
    onUpdate={onUpdate}
    onEnterKey={onEnterKey}
    className=""
    style={{
      color: "#374151",
      lineHeight: 1.6,
      minHeight: "1.5rem",
      textAlign:
        block.data.alignment || (editorDirection === "rtl" ? "right" : "left"),
    }}
    data-placeholder="Start writing..."
  />
);

const ProductionHeadingBlock: React.FC<BlockComponentProps> = ({
  block,
  onUpdate,
  onEnterKey,
  editorDirection,
}) => {
  const level = Math.max(3, Math.min(4, block.data.level || 3));
  //const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {[3, 4].map((l) => (
          <button
            key={l}
            onClick={() => onUpdate({ level: l, html: block.data.html })}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              border: `1px solid ${level === l ? "#93c5fd" : "#e5e7eb"}`,
              borderRadius: "0.25rem",
              backgroundColor: level === l ? "#eff6ff" : "#f9fafb",
              cursor: "pointer",
            }}
          >
            H{l}
          </button>
        ))}
      </div>
      <EditableBlock
        as="h3" // Always h3, don't change the element type
        block={block}
        onUpdate={onUpdate}
        onEnterKey={onEnterKey}
        className=""
        style={{
          fontWeight: "bold",
          color: "#111827",
          fontSize: level === 3 ? "1.5rem" : "1.25rem", // Different sizes for different levels
          textAlign:
            block.data.alignment ||
            (editorDirection === "rtl" ? "right" : "left"),
        }}
        data-placeholder={`Heading ${level}`}
      />
    </div>
  );
};

const QuoteBlock: React.FC<BlockComponentProps> = ({
  block,
  onUpdate,
  onEnterKey,
  editorDirection,
}) => (
  <blockquote
    style={{
      borderInlineStart: "4px solid #3b82f6",
      paddingInlineStart: "1rem",
      paddingBlock: "0.5rem",
      textAlign: "left",
    }}
  >
    <EditableBlock
      block={block}
      onUpdate={(data: any) => onUpdate({ text: data.html })}
      onEnterKey={onEnterKey}
      className=""
      style={{
        fontSize: "1.125rem",
        color: "#4b5563",
        fontStyle: "italic",
        minHeight: "1.5rem",
      }}
      data-placeholder="Enter quote text..."
    />
    <EditableBlock
      block={{ ...block, data: { html: block.data.citation } }}
      onUpdate={(data: any) => onUpdate({ citation: data.html })}
      onEnterKey={(e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter") e.preventDefault();
      }}
      as="footer"
      className=""
      style={{
        marginTop: "0.5rem",
        fontSize: "0.875rem",
        color: "#6b7280",
        fontStyle: "normal",
        minHeight: "1.25rem",
      }}
      data-placeholder="— Source"
    />
  </blockquote>
);

const ImageBlock: React.FC<{ block: Block; onUpdate: (data: any) => void }> = ({
  block,
  onUpdate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) =>
    onUpdate({ url: e.target.value });
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (loadEvent) =>
        onUpdate({ url: loadEvent.target?.result as string });
      reader.readAsDataURL(e.target.files[0]);
    }
  };
  if (!block.data.url) {
    return (
      <div
        style={{
          backgroundColor: "#f9fafb",
          padding: "1rem",
          borderRadius: "0.5rem",
          border: "2px dashed #e5e7eb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <input
            type="text"
            placeholder="Paste image URL"
            onChange={handleUrlChange}
            className="form-input"
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>OR</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="button button-secondary"
          >
            Upload
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            accept="image/*"
          />
        </div>
      </div>
    );
  }
  return (
    <figure style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <img
        src={block.data.url}
        alt={block.data.caption || ""}
        style={{ width: "100%", height: "auto", borderRadius: "0.5rem" }}
      />
      <input
        type="text"
        value={block.data.caption || ""}
        onChange={(e) => onUpdate({ caption: e.target.value })}
        placeholder="Add a caption..."
        style={{
          width: "100%",
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#6b7280",
          background: "transparent",
          outline: "none",
          border: "none",
          padding: "0.25rem",
        }}
      />
    </figure>
  );
};

const EmbedBlock: React.FC<{ block: Block; onUpdate: (data: any) => void }> = ({
  block,
  onUpdate,
}) => {
  const [editMode, setEditMode] = useState(!block.data.url);
  const [url, setUrl] = useState(block.data.url || "");
  const [isLoading, setIsLoading] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);

  const embedServices = [
    {
      name: "YouTube",
      type: "youtube",
      icon: Youtube,
      regex:
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S+)?/,
      idIndex: 1,
    },
    {
      name: "Twitter/X",
      type: "twitter",
      icon: Twitter,
      regex:
        /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
      idIndex: 1,
    },
    {
      name: "Instagram",
      type: "instagram",
      icon: Instagram,
      regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      idIndex: 1,
    },
    {
      name: "Threads",
      type: "threads",
      icon: Hash,
      regex:
        /(?:https?:\/\/)?(?:www\.)?threads\.net\/@[\w.]+\/post\/([A-Za-z0-9_-]+)|(?:https?:\/\/)?(?:www\.)?threads\.com\/@[\w.]+\/post\/([A-Za-z0-9_-]+)/,
      idIndex: 1,
    },
  ];

  const getEmbedData = (urlToParse: string) => {
    for (const service of embedServices) {
      const match = urlToParse.match(service.regex);
      if (match) {
        return {
          type: service.type,
          id: match[service.idIndex] || match[2], // Handle threads multiple capture groups
          fullUrl: urlToParse,
        };
      }
    }
    return null;
  };

  // Load external scripts
  useEffect(() => {
    // Load Twitter widgets script
    if (!document.querySelector('script[src*="platform.twitter.com"]')) {
      const twitterScript = document.createElement("script");
      twitterScript.async = true;
      twitterScript.src = "https://platform.twitter.com/widgets.js";
      twitterScript.charset = "utf-8";
      document.head.appendChild(twitterScript);
    }

    // Load Instagram embed script
    if (!document.querySelector('script[src*="instagram.com/embed"]')) {
      const instaScript = document.createElement("script");
      instaScript.async = true;
      instaScript.src = "//www.instagram.com/embed.js";
      document.head.appendChild(instaScript);
    }
  }, []);

  const embedYouTube = (url: string, videoId: string) => {
    if (!embedRef.current) return;

    const iframe = document.createElement("iframe");
    iframe.width = "100%";
    iframe.height = "315";
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.title = "YouTube video player";
    iframe.frameBorder = "0";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.style.borderRadius = "0.5rem";

    embedRef.current.innerHTML = "";
    embedRef.current.appendChild(iframe);
  };

  const embedTwitter = (url: string) => {
    if (!embedRef.current) return;

    embedRef.current.innerHTML = "";

    const blockquote = document.createElement("blockquote");
    blockquote.className = "twitter-tweet";
    blockquote.setAttribute("data-theme", "light");
    blockquote.setAttribute("data-width", "550");

    const link = document.createElement("a");
    link.href = url;
    link.textContent = "Loading tweet...";
    blockquote.appendChild(link);

    embedRef.current.appendChild(blockquote);

    // Process with Twitter widgets
    setTimeout(() => {
      if (window.twttr && window.twttr.widgets && embedRef.current) {
        window.twttr.widgets.load(embedRef.current);
      }
    }, 100);
  };

  const embedInstagram = (url: string) => {
    if (!embedRef.current) return;

    embedRef.current.innerHTML = "";

    const blockquote = document.createElement("blockquote");
    blockquote.className = "instagram-media";
    blockquote.setAttribute("data-instgrm-permalink", url);
    blockquote.setAttribute("data-instgrm-version", "14");
    blockquote.style.background = "#FFF";
    blockquote.style.border = "0";
    blockquote.style.borderRadius = "3px";
    blockquote.style.maxWidth = "540px";
    blockquote.style.margin = "1rem auto";
    blockquote.style.minWidth = "326px";
    blockquote.style.padding = "0";
    blockquote.style.width = "100%";

    // Add loading text
    const loadingText = document.createElement("p");
    loadingText.textContent = "Loading Instagram post...";
    loadingText.style.textAlign = "center";
    loadingText.style.padding = "2rem";
    blockquote.appendChild(loadingText);

    embedRef.current.appendChild(blockquote);

    // Process with Instagram embeds
    setTimeout(() => {
      if (window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
      }
    }, 100);
  };

  const embedThreads = (url: string) => {
    if (!embedRef.current) return;

    embedRef.current.innerHTML = "";

    const blockquote = document.createElement("blockquote");
    blockquote.className = "instagram-media";
    blockquote.setAttribute("data-instgrm-permalink", url);
    blockquote.setAttribute("data-instgrm-version", "14");
    blockquote.style.background = "#FFF";
    blockquote.style.border = "0";
    blockquote.style.borderRadius = "3px";
    blockquote.style.maxWidth = "540px";
    blockquote.style.margin = "1rem auto";
    blockquote.style.minWidth = "326px";
    blockquote.style.padding = "0";
    blockquote.style.width = "100%";

    // Add loading text
    const loadingText = document.createElement("p");
    loadingText.textContent = "Loading Threads post...";
    loadingText.style.textAlign = "center";
    loadingText.style.padding = "2rem";
    blockquote.appendChild(loadingText);

    embedRef.current.appendChild(blockquote);

    // Process with Instagram embeds (Threads uses same script)
    setTimeout(() => {
      if (window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
      }
    }, 100);
  };

  const handleEmbed = () => {
    const embedData = getEmbedData(url);
    if (embedData) {
      setIsLoading(true);
      onUpdate({
        url,
        embedType: embedData.type,
        embedId: embedData.id,
        fullUrl: embedData.fullUrl,
      });
      setEditMode(false);
      setIsLoading(false);
    } else {
      alert(
        "Unsupported URL. Please use a valid YouTube, Twitter, Instagram, or Threads link."
      );
    }
  };

  const renderPreview = () => {
    return <div ref={embedRef} style={{ width: "100%", minHeight: "200px" }} />;
  };

  // Handle embedding when block data changes
  useEffect(() => {
    const { embedType, embedId, fullUrl } = block.data;

    if (embedType && embedId && embedRef.current && !editMode) {
      switch (embedType) {
        case "youtube":
          embedYouTube(fullUrl, embedId);
          break;
        case "twitter":
          embedTwitter(fullUrl);
          break;
        case "instagram":
          embedInstagram(fullUrl);
          break;
        case "threads":
          embedThreads(fullUrl);
          break;
      }
    }
  }, [block.data.embedType, block.data.embedId, block.data.fullUrl, editMode]);

  if (editMode || !block.data.embedType) {
    return (
      <div
        style={{
          backgroundColor: "#f9fafb",
          padding: "1rem",
          borderRadius: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Globe size={16} style={{ color: "#6b7280" }} />
          <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>
            Embed Social Media
          </p>
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube, Twitter, Instagram, or Threads link..."
          className="form-input"
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={handleEmbed}
            className="button button-primary"
            disabled={isLoading}
          >
            {isLoading ? "Embedding..." : "Embed"}
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#6b7280",
            }}
          >
            <div title="YouTube">
              <Youtube size={18} />
            </div>
            <div title="Twitter/X">
              <Twitter size={18} />
            </div>
            <div title="Instagram">
              <Instagram size={18} />
            </div>
            <div title="Threads">
              <Hash size={18} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="embed-preview-wrapper" style={{ position: "relative" }}>
      {renderPreview()}
      <button
        onClick={() => setEditMode(true)}
        className="embed-edit-button"
        style={{
          position: "absolute",
          top: "0.5rem",
          right: "0.5rem",
          backgroundColor: "white",
          padding: "0.25rem",
          borderRadius: "9999px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          opacity: 0,
          transition: "opacity 0.2s",
          border: "none",
          cursor: "pointer",
        }}
      >
        <Settings size={16} />
      </button>
      <style>{`.embed-preview-wrapper:hover .embed-edit-button { opacity: 1; }`}</style>
    </div>
  );
};

const ListBlock: React.FC<BlockComponentProps> = ({
  block,
  onUpdate,
  onEnterKey,
}) => {
  const items = block.data.items || [""];
  const isOrdered = block.data.type === "ordered";

  return (
    <div>
      <div style={{ marginBottom: "0.5rem" }}>
        <button onClick={() => onUpdate({ type: "unordered" })}>
          • Bullet
        </button>
        <button onClick={() => onUpdate({ type: "ordered" })}>
          1. Numbered
        </button>
      </div>
      {isOrdered ? (
        <ol>
          {items.map((item: string, index: number) => (
            <li key={index}>
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newItems = [...items];
                  newItems[index] = e.currentTarget.textContent || "";
                  onUpdate({ items: newItems });
                }}
                dangerouslySetInnerHTML={{ __html: item }}
              />
            </li>
          ))}
        </ol>
      ) : (
        <ul>
          {items.map((item: string, index: number) => (
            <li key={index}>
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const newItems = [...items];
                  newItems[index] = e.currentTarget.textContent || "";
                  onUpdate({ items: newItems });
                }}
                dangerouslySetInnerHTML={{ __html: item }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
// Add this new component before TableBlock
const TableCell: React.FC<{
  content: string;
  placeholder: string;
  rowIndex: number;
  colIndex: number;
  tabIndex: number;
  onUpdate: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  isHovered: boolean;
}> = ({
  content,
  placeholder,
  rowIndex,
  colIndex,
  tabIndex,
  onUpdate,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  isHovered,
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const isTypingRef = useRef(false);
  const lastContentRef = useRef<string>(content);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInput = useCallback(() => {
    if (isComposingRef.current || !cellRef.current) return;

    isTypingRef.current = true;
    const currentContent = cellRef.current.textContent || "";
    lastContentRef.current = currentContent;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounced update
    timeoutRef.current = setTimeout(() => {
      onUpdate(currentContent);
      isTypingRef.current = false;
      timeoutRef.current = null;
    }, 300);
  }, [onUpdate]);

  const handleBlur = useCallback(() => {
    if (cellRef.current) {
      // Clear any pending timeout since we're saving immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const currentContent = cellRef.current.textContent || "";
      lastContentRef.current = currentContent;
      onUpdate(currentContent);
      isTypingRef.current = false;
    }
  }, [onUpdate]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    if (cellRef.current) {
      const currentContent = cellRef.current.textContent || "";
      lastContentRef.current = currentContent;
      onUpdate(currentContent);
    }
  }, [onUpdate]);

  // Only update textContent when content changes from outside AND user is not typing
  useEffect(() => {
    if (
      cellRef.current &&
      content !== lastContentRef.current &&
      !isTypingRef.current &&
      !isComposingRef.current &&
      document.activeElement !== cellRef.current
    ) {
      cellRef.current.textContent = content;
      lastContentRef.current = content;
    }
  }, [content]);

  // Initial content setup
  useEffect(() => {
    if (cellRef.current && !cellRef.current.textContent && content) {
      cellRef.current.textContent = content;
      lastContentRef.current = content;
    }
  }, []);

  useEffect(() => {
    const element = cellRef.current;
    if (!element) return;

    element.addEventListener("input", handleInput);
    element.addEventListener("blur", handleBlur);
    element.addEventListener("compositionstart", handleCompositionStart);
    element.addEventListener("compositionend", handleCompositionEnd);

    return () => {
      element.removeEventListener("input", handleInput);
      element.removeEventListener("blur", handleBlur);
      element.removeEventListener("compositionstart", handleCompositionStart);
      element.removeEventListener("compositionend", handleCompositionEnd);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [handleInput, handleBlur, handleCompositionStart, handleCompositionEnd]);

  return (
    <div
      ref={cellRef}
      contentEditable
      suppressContentEditableWarning
      tabIndex={tabIndex}
      data-cell={`${rowIndex}-${colIndex}`}
      style={{
        padding: "0.75rem",
        minHeight: "2.5rem",
        outline: "none",
        backgroundColor: isHovered ? "#f8fafc" : "transparent",
        transition: "background-color 0.2s",
        wordWrap: "break-word",
        whiteSpace: "pre-wrap",
        maxWidth: "200px", // Prevent cells from getting too wide
        overflow: "hidden",
      }}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-placeholder={placeholder}
    />
  );
};

const TableBlock: React.FC<BlockComponentProps> = ({ block, onUpdate }) => {
  const tableData: string[][] = block.data.table || [
    ["", ""],
    ["", ""],
  ];
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const currentEditingCell = useRef<{
    row: number;
    col: number;
    content: string;
  } | null>(null);

  const addRow = (afterIndex: number) => {
    const newTable = [...tableData];
    const newRow = new Array(tableData[0].length).fill("");
    newTable.splice(afterIndex + 1, 0, newRow);
    onUpdate({ table: newTable });
  };

  const addColumn = (afterIndex: number) => {
    const newTable = tableData.map((row: string[]) => {
      const newRow = [...row];
      newRow.splice(afterIndex + 1, 0, "");
      return newRow;
    });
    onUpdate({ table: newTable });
  };

  const removeRow = (rowIndex: number) => {
    if (tableData.length > 1) {
      const newTable = tableData.filter(
        (_: string[], index: number) => index !== rowIndex
      );
      onUpdate({ table: newTable });
    }
  };

  const removeColumn = (colIndex: number) => {
    if (tableData[0].length > 1) {
      const newTable = tableData.map((row: string[]) =>
        row.filter((_: string, index: number) => index !== colIndex)
      );
      onUpdate({ table: newTable });
    }
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newTable = [...tableData];
    newTable[rowIndex][colIndex] = value;
    onUpdate({ table: newTable });
  };

  // Save any unsaved content when focus leaves the table
  const saveCurrentEditingCell = () => {
    if (currentEditingCell.current) {
      const { row, col, content } = currentEditingCell.current;
      updateCell(row, col, content);
      currentEditingCell.current = null;
    }
  };

  // Handle focus leaving the entire table
  useEffect(() => {
    const handleFocusOut = (e: FocusEvent) => {
      if (
        tableRef.current &&
        !tableRef.current.contains(e.relatedTarget as Node)
      ) {
        // Focus is leaving the table entirely
        saveCurrentEditingCell();
      }
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener("focusout", handleFocusOut);
      return () => {
        tableElement.removeEventListener("focusout", handleFocusOut);
      };
    }
  }, []);

  // Also save when component is about to unmount or update
  useEffect(() => {
    return () => {
      saveCurrentEditingCell();
    };
  }, []);

  // Tab navigation handler
  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    colIndex: number
  ) => {
    if (e.key === "Tab") {
      e.preventDefault();

      const totalCols = tableData[0].length;
      const totalRows = tableData.length;

      // Save current cell content before any navigation
      const currentCell = e.currentTarget as HTMLElement;
      const currentContent = currentCell.textContent || "";
      updateCell(rowIndex, colIndex, currentContent);

      if (e.shiftKey) {
        // Shift+Tab - go to previous cell
        let prevCol = colIndex - 1;
        let prevRow = rowIndex;

        if (prevCol < 0) {
          prevCol = totalCols - 1;
          prevRow = rowIndex - 1;
        }

        if (prevRow >= 0) {
          // Focus previous cell
          setTimeout(() => {
            const prevCell = document.querySelector(
              `[data-cell="${prevRow}-${prevCol}"]`
            ) as HTMLElement;
            if (prevCell) prevCell.focus();
          }, 0);
        }
      } else {
        // Tab - go to next cell
        let nextCol = colIndex + 1;
        let nextRow = rowIndex;

        if (nextCol >= totalCols) {
          nextCol = 0;
          nextRow = rowIndex + 1;
        }

        if (nextRow >= totalRows) {
          // Add new row if we're at the end
          addRow(totalRows - 1);
          nextRow = totalRows; // Focus will be on the new row

          // Focus next cell after DOM update
          setTimeout(() => {
            const nextCell = document.querySelector(
              `[data-cell="${nextRow}-${nextCol}"]`
            ) as HTMLElement;
            if (nextCell) nextCell.focus();
          }, 50); // Slightly longer timeout for row creation
        } else {
          // Focus next cell
          setTimeout(() => {
            const nextCell = document.querySelector(
              `[data-cell="${nextRow}-${nextCol}"]`
            ) as HTMLElement;
            if (nextCell) nextCell.focus();
          }, 0);
        }
      }
    }
  };

  // Calculate tab indices - cells get 1-N, controls get N+1 onwards
  const totalCells = tableData.length * tableData[0].length;
  const getControlTabIndex = (baseIndex: number) => totalCells + baseIndex;

  return (
    <div
      ref={tableRef}
      style={{
        position: "relative",
        overflow: "auto",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        backgroundColor: "#fff",
      }}
    >
      {/* Column controls */}
      <div
        style={{
          display: "flex",
          paddingLeft: "2rem", // Offset for row controls
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        {tableData[0]?.map((_: string, colIndex: number) => (
          <div
            key={colIndex}
            style={{
              flex: 1,
              minWidth: "120px",
              position: "relative",
              display: "flex",
              justifyContent: "center",
              padding: "0.25rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button
                tabIndex={getControlTabIndex(colIndex * 3 + 1)}
                onClick={() => addColumn(colIndex - 1)}
                style={{
                  width: "1.5rem",
                  height: "1.5rem",
                  borderRadius: "0.25rem",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#f9fafb",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Add column before"
              >
                +
              </button>
              {tableData[0].length > 1 && (
                <button
                  tabIndex={getControlTabIndex(colIndex * 3 + 2)}
                  onClick={() => removeColumn(colIndex)}
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "0.25rem",
                    border: "1px solid #ef4444",
                    backgroundColor: "#fef2f2",
                    color: "#ef4444",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Remove column"
                >
                  ×
                </button>
              )}
              <button
                tabIndex={getControlTabIndex(colIndex * 3 + 3)}
                onClick={() => addColumn(colIndex)}
                style={{
                  width: "1.5rem",
                  height: "1.5rem",
                  borderRadius: "0.25rem",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#f9fafb",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Add column after"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "auto", // Auto column width like Editor.js
        }}
      >
        <tbody>
          {tableData.map((row: string[], rowIndex: number) => (
            <tr key={rowIndex}>
              {/* Row controls */}
              <td
                style={{
                  width: "2rem",
                  padding: "0",
                  borderRight: "1px solid #f3f4f6",
                  backgroundColor: "#f9fafb",
                  verticalAlign: "middle",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.125rem",
                    padding: "0.25rem",
                    alignItems: "center",
                  }}
                >
                  <button
                    tabIndex={getControlTabIndex(1000 + rowIndex * 3 + 1)}
                    onClick={() => addRow(rowIndex - 1)}
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "0.625rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Add row above"
                  >
                    +
                  </button>
                  {tableData.length > 1 && (
                    <button
                      tabIndex={getControlTabIndex(1000 + rowIndex * 3 + 2)}
                      onClick={() => removeRow(rowIndex)}
                      style={{
                        width: "1.25rem",
                        height: "1.25rem",
                        borderRadius: "0.25rem",
                        border: "1px solid #ef4444",
                        backgroundColor: "#fef2f2",
                        color: "#ef4444",
                        fontSize: "0.625rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Remove row"
                    >
                      ×
                    </button>
                  )}
                  <button
                    tabIndex={getControlTabIndex(1000 + rowIndex * 3 + 3)}
                    onClick={() => addRow(rowIndex)}
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "0.625rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Add row below"
                  >
                    +
                  </button>
                </div>
              </td>

              {/* Table cells - REPLACE the existing cell mapping */}
              {row.map((cell: string, colIndex: number) => {
                const cellTabIndex =
                  rowIndex * tableData[0].length + colIndex + 1;
                return (
                  <td
                    key={colIndex}
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "0",
                      minWidth: "120px",
                      maxWidth: "200px", // Prevent too wide cells
                      position: "relative",
                    }}
                  >
                    <TableCell
                      content={cell}
                      placeholder={
                        rowIndex === 0
                          ? `Header ${colIndex + 1}`
                          : `Row ${rowIndex + 1}, Col ${colIndex + 1}`
                      }
                      rowIndex={rowIndex}
                      colIndex={colIndex}
                      tabIndex={cellTabIndex}
                      onUpdate={(content) =>
                        updateCell(rowIndex, colIndex, content)
                      }
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                      onMouseEnter={() =>
                        setHoveredCell({ row: rowIndex, col: colIndex })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      isHovered={
                        hoveredCell?.row === rowIndex &&
                        hoveredCell?.col === colIndex
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Quick add row at bottom */}
      <div
        style={{
          textAlign: "center",
          padding: "0.5rem",
          borderTop: "1px solid #f3f4f6",
          backgroundColor: "#f9fafb",
        }}
      >
        <button
          tabIndex={getControlTabIndex(2000)}
          onClick={() => addRow(tableData.length - 1)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            border: "1px solid #d1d5db",
            backgroundColor: "white",
            fontSize: "0.875rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            margin: "0 auto",
          }}
        >
          <Plus size={14} />
          Add Row
        </button>
      </div>

      <style>{`
        [data-placeholder]:empty:before { 
          content: attr(data-placeholder); 
          color: #9ca3af; 
          pointer-events: none; 
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

const DividerBlock: React.FC = () => (
  <hr
    style={{ border: "none", borderTop: "2px solid #e5e7eb", margin: "1rem 0" }}
  />
);

const RawHtmlBlock: React.FC<{
  block: Block;
  onUpdate: (data: any) => void;
}> = ({ block, onUpdate }) => {
  const [preview, setPreview] = useState(false);
  return (
    <div
      style={{
        backgroundColor: "#f9fafb",
        padding: "0.5rem",
        borderRadius: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>Raw HTML</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setPreview(false)}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              borderRadius: "0.25rem",
              background: !preview ? "#dbeafe" : "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Edit
          </button>
          <button
            onClick={() => setPreview(true)}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              borderRadius: "0.25rem",
              background: preview ? "#dbeafe" : "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Preview
          </button>
        </div>
      </div>
      {preview ? (
        <div dangerouslySetInnerHTML={{ __html: block.data.html || "" }} />
      ) : (
        <textarea
          style={{
            width: "100%",
            boxSizing: "border-box",
            height: "6rem",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            border: "1px solid #e5e7eb",
            borderRadius: "0.25rem",
            padding: "0.75rem",
          }}
          value={block.data.html || ""}
          onChange={(e) => onUpdate({ html: e.target.value })}
        />
      )}
    </div>
  );
};

const ProductionHtmlEditor: React.FC<{
  block: Block;
  onUpdate: (data: any) => void;
  onSave: () => void;
}> = ({ block, onUpdate, onSave }) => {
  const [html, setHtml] = useState(block.data.html || "");

  // Sync with block data when editor opens
  useEffect(() => {
    setHtml(block.data.html || "");
  }, [block.data.html]);

  const handleSave = () => {
    onUpdate({ html });
    onSave();
  };

  return (
    <div
      style={{
        backgroundColor: "#1f2937",
        color: "white",
        fontFamily: "monospace",
        padding: "1rem",
        borderRadius: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <h4
          style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#facc15" }}
        >
          HTML Editor
        </h4>
        <button
          onClick={onSave}
          style={{
            color: "#9ca3af",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>
      </div>
      <textarea
        style={{
          width: "100%",
          boxSizing: "border-box",
          height: "10rem",
          backgroundColor: "#111827",
          color: "#6ee7b7",
          padding: "0.5rem",
          borderRadius: "0.375rem",
          border: "1px solid #374151",
        }}
        value={html}
        onChange={(e) => setHtml(e.target.value)}
      />
      <div style={{ textAlign: "right", marginTop: "0.5rem" }}>
        <button
          onClick={handleSave}
          className="button button-primary"
          style={{ padding: "0.25rem 1rem" }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

// AI Assistant
const AIAssistant: React.FC<{
  open: boolean;
  onToggle: () => void;
  addBlock: (type: Block["type"], index: number, data?: any) => string;
  updateBlock: (id: string, data: any) => void;
  selectedBlock: Block | undefined;
}> = ({ open, onToggle, addBlock, updateBlock, selectedBlock }) => {
  const [isPrompting, setIsPrompting] = useState<AISuggestion | null>(null);
  const [prompt, setPrompt] = useState("");

  const aiFeatures: AISuggestion[] = [
    {
      id: "gen-text",
      type: "generate-text",
      title: "Generate Text",
      description: "Create content from a prompt.",
      icon: Wand2,
    },
    {
      id: "improve",
      type: "improve-writing",
      title: "Improve Writing",
      description: "Enhance clarity and style.",
      icon: Sparkles,
    },
    {
      id: "summarize",
      type: "summarize",
      title: "Summarize",
      description: "Create a concise summary.",
      icon: FileText,
    },
    {
      id: "gen-image",
      type: "generate-image",
      title: "Generate Image",
      description: "Create an image from a prompt.",
      icon: Camera,
    },
  ];

  const handleFeatureClick = (feature: AISuggestion) => {
    if (feature.type === "generate-text" || feature.type === "generate-image") {
      setIsPrompting(feature);
    } else if (selectedBlock) {
      if (feature.type === "summarize") {
        console.log(
          `Summary POC:\n\n${
            selectedBlock.data.html?.substring(0, 80) || ""
          }...`
        );
      } else if (feature.type === "improve-writing") {
        updateBlock(selectedBlock.id, {
          html: (selectedBlock.data.html || "") + " (improved!)",
        });
      }
    } else {
      console.log("Please select a block first to use this feature.");
    }
  };

  const handlePromptSubmit = () => {
    if (isPrompting?.type === "generate-text") {
      addBlock("paragraph", -1, {
        html: `(AI Generated for: "${prompt}") Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.`,
      });
    } else if (isPrompting?.type === "generate-image") {
      addBlock("image", -1, {
        url: `https://placehold.co/600x400/EEE/31343C?text=${encodeURIComponent(
          prompt
        )}`,
        caption: prompt,
      });
    }
    setPrompt("");
    setIsPrompting(null);
  };

  if (!open)
    return (
      <div
        style={{
          width: "4rem",
          backgroundColor: "white",
          borderLeft: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "1rem 0",
        }}
      >
        <button
          onClick={onToggle}
          style={{
            padding: "0.5rem",
            borderRadius: "0.5rem",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Bot
            style={{ width: "1.25rem", height: "1.25rem", color: "#8b5cf6" }}
          />
        </button>
      </div>
    );

  return (
    <div
      style={{
        width: "20rem",
        backgroundColor: "white",
        borderLeft: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ fontWeight: 600 }}>AI Assistant</h3>
        <button
          onClick={onToggle}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <X size={16} />
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {aiFeatures.map((f) => (
          <button
            key={f.id}
            onClick={() => handleFeatureClick(f)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              background: "none",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <f.icon size={20} style={{ color: "#8b5cf6" }} />
            <div>
              <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                {f.title}
              </div>
              <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                {f.description}
              </p>
            </div>
          </button>
        ))}
      </div>
      {isPrompting && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: "32rem" }}>
            <h3 className="modal-title" style={{ marginBottom: "1rem" }}>
              {isPrompting.title}
            </h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt..."
              className="form-input"
              style={{ height: "6rem", marginBottom: "1rem" }}
            />
            <div className="modal-footer">
              <button
                onClick={() => setIsPrompting(null)}
                className="button button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handlePromptSubmit}
                className="button"
                style={{ backgroundColor: "#8b5cf6", color: "white" }}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Functions
const getDefaultBlockData = (type: Block["type"]) => {
  switch (type) {
    case "paragraph":
      return { html: "" };
    case "heading":
      return { html: "", level: 3 };
    case "image":
      return { url: "", alt: "", caption: "" };
    case "quote":
      return { text: "", citation: "" };
    case "list":
      return { type: "unordered", items: [""] };
    case "embed":
      return { url: "", embedType: "", embedId: "", fullUrl: "" };
    case "table":
      return {
        table: [
          ["", ""],
          ["", ""],
        ], // Start with empty placeholders
      };
    case "divider":
      return {};
    case "raw-html":
      return { html: "" };
    default:
      return {};
  }
};

const getWordCount = (text: string): number => {
  if (!text) return 0;
  const cleanText = text.replace(/<[^>]*>/g, " ").trim();
  return cleanText ? cleanText.split(/\s+/).length : 0;
};

export default UltimateNewsEditor;
