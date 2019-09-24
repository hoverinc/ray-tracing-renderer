workflow "check" {
  on = "push"
}

action "test" {
  uses = "./.github/actions/test"
}
