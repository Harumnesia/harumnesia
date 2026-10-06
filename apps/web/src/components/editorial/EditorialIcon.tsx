export type EditorialIconName =
  | 'leaf'
  | 'note'
  | 'layers'
  | 'bottle'
  | 'globe'
  | 'moon'
  | 'edit'
  | 'reset'
  | 'arrow'
  | 'menu'
  | 'close';

const PATHS: Record<EditorialIconName, string> = {
  leaf: 'M5 21C8 14 12 8 19 3M8 15C3 15 3 10 4 8C8 8 10 11 8 15ZM12 10C9 7 10 3 12 2C15 5 15 8 12 10ZM13 11C14 7 18 6 21 7C20 11 17 13 13 11ZM9 17C12 13 16 14 18 15C15 18 12 19 9 17Z',
  note: 'M12 20V4M8 7C8 4 10 3 12 3C14 3 16 4 16 7M7 12C4 12 3 10 3 8C7 8 10 10 12 13M17 12C20 12 21 10 21 8C17 8 14 10 12 13M6 17C6 14 9 13 12 15C15 13 18 14 18 17',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5',
  bottle:
    'M9 3h6v4H9ZM10 7v3H8a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2V7M9 14h6',
  globe:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18C7 16 7 8 12 3Z',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
  edit: 'm4 16-1 5 5-1L20 8a2 2 0 0 0-4-4L4 16ZM14 6l4 4M4 16l4 4',
  reset: 'M5 7a8 8 0 1 1-1 9M5 3v5h5',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'm5 5 14 14M19 5 5 19',
};

export function EditorialIcon({ name }: { name: EditorialIconName }) {
  return (
    <svg
      aria-hidden="true"
      className={`editorial-icon editorial-icon--${name}`}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.25"
      viewBox="0 0 24 24"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
