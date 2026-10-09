import { expect, test } from 'claude-code/testing'
import { executedText } from './bash-text-rules'

test('a plain command is returned as it is', () => {
  expect(executedText('git status && ls -la')).toBe('git status && ls -la')
})

test('interpreter code passed with -e or -c is dropped', () => {
  expect(executedText("node -e 'rows.map(row => row.key)'")).toBe('node -e ')
  expect(executedText('node --eval="x.key"')).toBe('node ')
  expect(executedText("python3 -c 'open(\".env\")'")).toBe('python3 -c ')
  expect(executedText("ruby -e 'puts 1' && perl -e 'print 1'")).toBe('ruby -e  && perl -e ')
})

test('the heredoc body of a program that is not a shell is dropped, the rest of the line stays', () => {
  expect(executedText("cat > notes.md <<'EOF'\nsee .env and id_rsa\ngit push\nEOF")).toBe('cat > notes.md <<\'EOF\'\n')
  expect(executedText('python3 - <<EOF\nopen("~/.ssh/id_rsa")\nEOF\ngit push')).toBe('python3 - <<EOF\n\ngit push')
  expect(executedText('cat > f <<EOF && git push\nbody\nEOF')).toBe('cat > f <<EOF && git push\n')
  expect(executedText('cat <<-EOF > f\n\tbody\n\tEOF')).toBe('cat <<-EOF > f\n')
})

test('the git commit message is dropped, whatever flag carries it', () => {
  expect(executedText('git commit -m "no git push here"')).toBe('git commit -m ')
  expect(executedText("git commit -am 'mention .env' -m second")).toBe('git commit -am  -m ')
  expect(executedText('git commit --message="rm -rf /"')).toBe('git commit ')
  expect(executedText('git commit -m"x .env"')).toBe('git commit ')
  expect(executedText('git -C /repo commit -m ".env"')).toBe('git -C /repo commit -m ')
  expect(executedText('git commit -F - <<EOF\ngit push and .env\nEOF')).toBe('git commit -F - <<EOF\n')
  expect(executedText("git commit -m \"$(cat <<'EOF'\nfix: don't git push\nEOF\n)\"")).toBe('git commit -m ')
})

test('only the message itself is dropped, chained commands stay', () => {
  expect(executedText('git commit -m "x" && git push')).toBe('git commit -m  && git push')
  expect(executedText('git commit -m "x"; cat .env')).toBe('git commit -m ; cat .env')
  expect(executedText('git commit -C HEAD -m x')).toBe('git commit -C HEAD -m ')
})

test('text that reaches a shell stays and is analysed as a command of its own', () => {
  expect(executedText('bash <<EOF\ngit push\nEOF')).toBe('bash <<EOF\ngit push\nEOF')
  expect(executedText("sh -c 'rm -rf /'")).toBe("sh -c 'rm -rf /'\nrm -rf /")
  expect(executedText('eval "git push"')).toBe('eval "git push"\ngit push')
  expect(executedText("echo 'rm -rf /' | bash")).toBe("echo 'rm -rf /' | bash\nrm -rf /")
  expect(executedText("cat <<'EOF' | sudo sh\nrm -rf /\nEOF")).toBe("cat <<'EOF' | sudo sh\nrm -rf /\nEOF")
  expect(executedText("node -e 'console.log(1)' | bash")).toBe("node -e 'console.log(1)' | bash\nconsole.log(1)")
})

test('programs that may run their stdin keep their heredoc, and so does anything piped onward', () => {
  for (const command of [
    'sudo -s <<EOF\ngit push\nEOF',
    'at now <<EOF\ngit push\nEOF',
    'make -f - <<EOF\nall:\n\tgit push\nEOF',
    "cat <<'EOF' | sudo -s\ngit push\nEOF",
    "node -e 'git push' | at now",
  ]) {
    expect(executedText(command)).toContain('git push')
  }
  expect(executedText("cat <<'EOF' | head -1\ngit push\nEOF")).not.toContain('git push')
})

test('an unquoted heredoc line ending in a backslash is returned whole, since bash joins it to the next', () => {
  const command = 'cat > /dev/null <<EOF\nEO\\\nF\ngit push\nEOF'
  expect(executedText(command)).toBe(command)
  expect(executedText("cat > f <<'EOF'\nline \\\nEOF")).toBe("cat > f <<'EOF'\n")
})

test('command substitutions run, so they are never dropped', () => {
  expect(executedText('git commit -m "$(git push)"')).toBe('git commit -m "$(git push)"')
  expect(executedText('node -e "`cat .env`"')).toBe('node -e "`cat .env`"')
  expect(executedText('cat > f <<EOF\n$(rm -rf /)\nEOF')).toBe('cat > f <<EOF\n$(rm -rf /)\nEOF')
})

test('a command it cannot parse is returned whole', () => {
  for (const command of ["node -e 'x.key", 'git commit -m "x .env', 'cat > f <<EOF\ngit push', 'cat <<', 'python3 - <<EOF\nbody\nEO']) {
    expect(executedText(command)).toBe(command)
  }
})
