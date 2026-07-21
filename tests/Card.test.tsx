import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '../components/Card';

describe('Card component', () => {
  it('renders children correctly', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });
  
  it('applies default classes correctly', () => {
    const { container } = render(<Card>Content</Card>);
    const div = container.firstChild;
    expect(div).toHaveClass('bg-cream');
    expect(div).toHaveClass('border-hairline');
    expect(div).toHaveClass('rounded-xl');
  });

  it('merges custom classes', () => {
    const { container } = render(<Card className="custom-test-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-test-class');
    expect(container.firstChild).toHaveClass('bg-cream'); // Should still have base classes
  });

  it('renders title if provided', () => {
    render(<Card title="Test Title">Content</Card>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Title').tagName).toBe('H2');
  });
});