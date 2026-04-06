import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { ErrorBoundary } from '../../components/ErrorBoundary'

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('test crash')
  return <Text testID="ok">ok</Text>
}

test('renders children when no error', () => {
  const { getByTestId } = render(
    <ErrorBoundary>
      <Bomb shouldThrow={false} />
    </ErrorBoundary>
  )
  expect(getByTestId('ok')).toBeTruthy()
})

test('renders fallback UI on error', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  const { getByTestId } = render(
    <ErrorBoundary>
      <Bomb shouldThrow={true} />
    </ErrorBoundary>
  )
  expect(getByTestId('error-boundary')).toBeTruthy()
  consoleSpy.mockRestore()
})
