import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonRow } from '../Skeleton';

describe('Skeleton', () => {
  it('renders with animate-shimmer class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-shimmer');
  });

  it('passes additional className through', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect(container.firstChild).toHaveClass('h-4', 'w-32');
  });
});

describe('SkeletonCard', () => {
  it('renders without throwing', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeTruthy();
  });

  it('matches snapshot', () => {
    const { container } = render(<SkeletonCard />);
    expect(container).toMatchSnapshot();
  });
});

describe('SkeletonRow', () => {
  it('renders a flex row', () => {
    const { container } = render(<SkeletonRow />);
    expect(container.firstChild).toHaveClass('flex', 'items-center');
  });
});

describe('SkeletonTable', () => {
  it('renders the correct number of rows', () => {
    const { container } = render(<SkeletonTable rows={4} />);
    const rows = container.querySelectorAll('.flex.items-center.gap-4');
    expect(rows).toHaveLength(4);
  });

  it('defaults to 5 rows', () => {
    const { container } = render(<SkeletonTable />);
    const rows = container.querySelectorAll('.flex.items-center.gap-4');
    expect(rows).toHaveLength(5);
  });
});
