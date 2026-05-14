import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ActivityFeed, type ActivityItem } from '../ActivityFeed';

const BASE_ITEM: ActivityItem = {
  id: 'test-id-1',
  status: 'correct',
  points_earned: 150,
  responded_at: new Date().toISOString(),
  display_name: 'Alice Johnson',
  puzzle_type: 'spot_the_phish',
  difficulty: 'medium',
};

describe('ActivityFeed', () => {
  it('renders empty state when no items', () => {
    render(<ActivityFeed items={[]} />);
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });

  it('renders item display name', () => {
    render(<ActivityFeed items={[BASE_ITEM]} />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('renders correct status badge for correct answer', () => {
    render(<ActivityFeed items={[BASE_ITEM]} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders incorrect status badge for wrong answer', () => {
    render(<ActivityFeed items={[{ ...BASE_ITEM, status: 'incorrect', points_earned: 0 }]} />);
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('renders puzzle type label', () => {
    render(<ActivityFeed items={[BASE_ITEM]} />);
    expect(screen.getByText('Spot the Phish')).toBeInTheDocument();
  });

  it('renders points when earned', () => {
    render(<ActivityFeed items={[BASE_ITEM]} />);
    expect(screen.getByText('+150')).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<ActivityFeed items={[BASE_ITEM]} />);
    expect(container).toMatchSnapshot();
  });
});
