from pylon.core.tools import log, web

from ..models.integration_pd import TaskSettingsModel
from tools import TaskManager, data_tools, constants, rpc_tools


class Event:
    integration_name = "email_base"

    @staticmethod
    def _prepare_task(integration_data: dict) -> dict:
        log.info('prepare task %s', integration_data)
        obj = {
            'project_id': integration_data.get("project_id"),
            **integration_data['settings'],
        }
        env_vars = TaskSettingsModel.parse_obj(obj)
        rpc = rpc_tools.RpcMixin().rpc
        if integration_data.get("project_id"):
            default_integration = rpc.call.integrations_get_defaults(
                project_id=integration_data.get("project_id"), name='s3_integration'
            )
            integration_id = default_integration.integration_id if default_integration else 1
        else:
            default_integration = rpc.call.integrations_get_admin_defaults(
                name='s3_integration'
            )
            integration_id = default_integration.id if default_integration else 1    
        is_local = bool(default_integration.project_id) if default_integration else False 

        return {
            'funcname': f'email_base_integration_{integration_data["id"]}',
            'invoke_func': 'lambda_function.lambda_handler',
            'runtime': 'Python 3.7',
            'env_vars': env_vars.json(),
            'region': 'default',
            's3_settings': {'integration_id': integration_id, 'is_local': is_local}
        }

    @web.event(f"{integration_name}_created_or_updated")
    def _created_or_updated(self, context, event, payload):
        project_id = payload.get('project_id')
        mode = 'administration' if not project_id else 'default'
        log.info('email base created or updated %s', payload)
        if not payload['task_id']:
            context.rpc_manager.call.integrations_update_attrs(
                integration_id=payload['id'],
                project_id=project_id,
                update_dict={'status': 'pending'},
                return_result=False
            )
            try:
                email_task = TaskManager(project_id=project_id,
                                         mode=mode).create_task(
                    self.descriptor.config['task_path'],
                    Event._prepare_task(payload),
                )
                log.info('reporter task id %s', email_task.task_id)
                updated_data = context.rpc_manager.call.integrations_update_attrs(
                    integration_id=payload['id'],
                    project_id=project_id,
                    update_dict={'status': 'success', 'task_id': email_task.task_id},
                    return_result=True
                )

                context.sio.emit('task_creation', {
                    'ok': True,
                    **updated_data
                })
            except Exception as e:
                updated_data = context.rpc_manager.call.integrations_update_attrs(
                    integration_id=payload['id'],
                    project_id=project_id,
                    update_dict={'status': str(e)},
                    return_result=True
                )
                log.error('Couldn\'t create task. %s', e)
                context.sio.emit("task_creation", {
                    'ok': False,
                    'msg': f'Couldn\'t create task for {updated_data["name"]} with id: {updated_data["id"]}. {e}',
                    **updated_data
                })
        else:  # task already created
            updated_env_vars = Event._prepare_task(payload)['env_vars']
            context.rpc_manager.call.tasks_update_env(
                task_id=payload['task_id'],
                env_vars=updated_env_vars,
                rewrite=True
            )
            context.sio.emit('task_creation', {
                'ok': True,
                'msg': 'Email task updated'
            })
