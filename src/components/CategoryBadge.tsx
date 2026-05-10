import { categoryClass } from '../lib/categories';

interface Props {
  category: string;
}

export function CategoryBadge({ category }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryClass(category)}`}
    >
      {category}
    </span>
  );
}
