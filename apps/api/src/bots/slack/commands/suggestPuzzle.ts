import { slackApp } from '../app'
import { db } from '../../../db/client'

slackApp.command('/suggest-puzzle', async ({ command, ack, client }) => {
  await ack()

  await client.views.open({
    trigger_id: command.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'submit_puzzle_suggestion',
      title: { type: 'plain_text', text: 'Suggest a Puzzle' },
      submit: { type: 'plain_text', text: 'Submit' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'input',
          block_id: 'scenario',
          element: {
            type: 'plain_text_input',
            action_id: 'scenario_input',
            multiline: true,
            placeholder: { type: 'plain_text', text: 'Describe the security scenario...' },
          },
          label: { type: 'plain_text', text: 'Scenario' },
        },
        {
          type: 'input',
          block_id: 'correct_action',
          element: {
            type: 'plain_text_input',
            action_id: 'correct_action_input',
            placeholder: { type: 'plain_text', text: 'What should the user do?' },
          },
          label: { type: 'plain_text', text: 'Correct Action' },
        },
      ],
    },
  })
})

slackApp.view('submit_puzzle_suggestion', async ({ view, ack, body }) => {
  await ack()
  const scenario = view.state.values['scenario']?.['scenario_input']?.value ?? ''
  const correctAction = view.state.values['correct_action']?.['correct_action_input']?.value ?? ''

  await db.query(
    `INSERT INTO puzzle_suggestions (submitter_slack_id, scenario, correct_action, status)
     VALUES ($1, $2, $3, 'pending')`,
    [body.user.id, scenario, correctAction],
  )
})
