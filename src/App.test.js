import { render, screen } from '@testing-library/react';
import App from './App';

test('renders AC Generator Pro', () => {
  render(<App />);
  const headingElement = screen.getByText(/AC Generator Pro/i);
  expect(headingElement).toBeInTheDocument();
});
