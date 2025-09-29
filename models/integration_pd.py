import smtplib

from pydantic import BaseModel, validator, root_validator
from pylon.core.tools import log

from ...integrations.models.pd.integration import SecretField


class IntegrationModel(BaseModel):
    host: str
    port: int
    user: str
    passwd: str | SecretField
    sender: str | None

    def check_connection(self, **kwargs) -> bool:
        from tools import session_project
        project_id = kwargs.get('project_id', session_project.get())
        try:
            if self.port == 465:
                with smtplib.SMTP_SSL(host=self.host, port=self.port) as server:
                    server.ehlo()
                    server.login(self.user, self.passwd.unsecret(project_id))
                return True
            elif self.port == 587:
                with smtplib.SMTP(host=self.host, port=self.port) as server:
                    server.starttls()
                    server.login(self.user, self.passwd.unsecret(project_id))
                return True
            else:
                return False
        except Exception as e:
            log.exception(e)
            return False


class TaskSettingsModel(IntegrationModel):
    galloper_url: str = '{{secret.galloper_url}}'
    token: str = '{{secret.auth_token}}'
    project_id: int | None
    passwd: str | dict

    @root_validator
    def validate_passwd(cls, values: dict):
        log.info('before validate passwd %s', values)
        if isinstance(values['passwd'], SecretField):
            values['passwd'] = values['passwd'].unsecret(project_id=values.get('project_id'))
        elif isinstance(values['passwd'], dict):
            values['passwd'] = SecretField.parse_obj(values['passwd']).unsecret(
                project_id=values.get('project_id'))
        log.info('after validate passwd %s', values)
        return values
