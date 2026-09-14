export interface Quiz {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  status?: "draft" | "published";
}

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_SELECT"
  | "TRUE_OR_FALSE"
  | "MATCHING"
  | "REORDER"
  | "FILL_IN_THE_BLANKS"
  | "OPEN_ENDED"
  | "MATH_RESPONSE"
  | "IMAGE_LABELING"
  | "IMAGE_HOTSPOT"
  | "CATEGORIZE_ITEMS";

export interface MatchingPair {
  left: string;
  right: string;
}

export interface LabelTarget {
  id: string;
  label: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  target_name?: string;
}

export interface HotspotZone {
  x: number; // 0-100 percentage center
  y: number; // 0-100 percentage center
  radius: number; // percentage radius e.g. 10%
  description?: string;
}

export interface CategorizeItem {
  text: string;
  category: string;
}

export type ImageSourceType =
  | "PASTE_UPLOAD"
  | "DIRECT_LINK"
  | "GOOGLE_IMAGE_SEARCH"
  | "NONE";

export interface QuestionOptionItem {
  option_letter: string;
  text: string;
  image_source_type: ImageSourceType;
  image_url: string;
  alt_text: string;
  is_correct: boolean;
}

export interface StructuredImageQuestionResponse {
  id_soal: string;
  tipe_soal: string;
  question: {
    text: string;
    image_source_type: ImageSourceType;
    image_url: string;
    alt_text: string;
  };
  options: QuestionOptionItem[];
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type?: QuestionType;
  image_url: string | null;
  image_source_type?: ImageSourceType;
  alt_text?: string | null;
  image_context?: string | null; // Visual description/context for image questions
  options: string[];
  option_items?: QuestionOptionItem[];
  correct_answer_index: number;
  correct_answers?: number[]; // for MULTIPLE_SELECT
  matching_pairs?: MatchingPair[]; // for MATCHING
  reorder_items?: string[]; // for REORDER
  correct_order?: number[]; // for REORDER
  blanks_keywords?: string[]; // for FILL_IN_THE_BLANKS
  rubric?: string[]; // for OPEN_ENDED
  math_solution?: string | null; // for MATH_RESPONSE
  label_targets?: LabelTarget[]; // for IMAGE_LABELING
  hotspot_zone?: HotspotZone | null; // for IMAGE_HOTSPOT
  categories?: string[]; // for CATEGORIZE_ITEMS
  categorize_items?: CategorizeItem[]; // for CATEGORIZE_ITEMS
  explanation: string | null;
  order_index: number;
}

export interface ParsedQuestion {
  id?: string;
  question_type?: QuestionType;
  question_text: string;
  image_url?: string | null;
  image_source_type?: ImageSourceType;
  alt_text?: string | null;
  image_context?: string | null;
  options: string[];
  option_items?: QuestionOptionItem[];
  correct_answer_index: number;
  correct_answers?: number[];
  matching_pairs?: MatchingPair[];
  reorder_items?: string[];
  correct_order?: number[];
  blanks_keywords?: string[];
  rubric?: string[];
  math_solution?: string | null;
  label_targets?: LabelTarget[];
  hotspot_zone?: HotspotZone | null;
  categories?: string[];
  categorize_items?: CategorizeItem[];
  explanation?: string | null;
  has_diagram?: boolean;
  diagram_box?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 scale
}

export interface StudentAnswer {
  question_id?: string;
  question_text: string;
  question_type?: QuestionType;
  selected_index?: number;
  correct_index?: number;
  selected_indices?: number[];
  user_text?: string;
  user_order?: number[];
  user_matches?: Record<string, string>;
  user_label_matches?: Record<string, string>; // pinId -> label
  user_hotspot_coords?: { x: number; y: number };
  user_categorization?: Record<string, string[]>; // category -> item texts
  is_correct: boolean;
}

export interface Submission {
  id: string;
  quiz_id: string;
  student_name: string;
  score: number;
  total_questions: number;
  answers: StudentAnswer[];
  completed_at: string;
}
