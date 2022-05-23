import React from 'react';
import { Input, CopyButton, Button, Icon } from 'UI'
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';
import Select from 'Shared/Select';
import { confirm } from 'UI/Confirmation';
import { connect } from 'react-redux';

interface Props {
    isSmtp?: boolean;
    isEnterprise?: boolean;
}
function UserForm(props: Props) {
    const { isSmtp = false, isEnterprise = false } = props;
    const { hideModal } = useModal();
    const { userStore, roleStore } = useStore();
    const isSaving = useObserver(() => userStore.saving);
    const user: any = useObserver(() => userStore.instance);
    const roles = useObserver(() => roleStore.list.filter(r => r.isProtected ? user.isSuperAdmin : true).map(r => ({ label: r.name, value: r.roleId })));

    const onChangeCheckbox = (e: any) => {
        user.updateKey('isAdmin', !user.isAdmin);
    }

    const onSave = () => {
        userStore.saveUser(user).then(() => {
            hideModal();
        });
    }

    const write = ({ target: { name, value } }) => {
        user.updateKey(name, value);
    }

    const deleteHandler = async () => {
        if (await confirm({
            header: 'Confirm',
            confirmButton: 'Yes, delete',
            confirmation: `Are you sure you want to permanently delete this user?`
          })) {
            userStore.deleteUser(user.userId).then(() => {
                hideModal();
            });
        }
    }
    
    return useObserver(() => (
        <div className="bg-white h-screen p-6" style={{ width: '400px'}}>
            <div className="">
                <h1 className="text-2xl mb-4">{`${user.exists() ? 'Update' : 'Invite'} User`}</h1>
            </div>
            <form onSubmit={ onSave } >
                <div className="form-group">
                    <label>{ 'Full Name' }</label>
                    <Input
                        name="name"
                        autoFocus
                        value={ user.name }
                        onChange={ write }
                        className="w-full"
                        id="name-field"
                    />
                </div>

                <div className="form-group">
                    <label>{ 'Email Address' }</label>
                    <Input
                        disabled={user.exists()}
                        name="email"
                        value={ user.email }
                        onChange={ write }
                        className="w-full"
                    />
                </div>
                { !isSmtp &&
                    <div className={cn("mb-4 p-2 bg-yellow rounded")}>
                        SMTP is not configured (see <a className="link" href="https://docs.openreplay.com/configuration/configure-smtp" target="_blank">here</a> how to set it up).  You can still add new users, but you’d have to manually copy then send them the invitation link.
                    </div>
                }
                <div className="form-group">
                    <label className="flex items-start cursor-pointer">
                        <input
                            name="admin"
                            type="checkbox"
                            checked={ !!user.isAdmin || !!user.isSuperAdmin }
                            onChange={ onChangeCheckbox }
                            disabled={user.isSuperAdmin}
                            className="mt-1"
                        />
                        <div className="ml-2 select-none">
                            <span>Admin Privileges</span>
                            <div className="text-sm color-gray-medium -mt-1">{ 'Can manage Projects and team members.' }</div>
                        </div>
                    </label>
                </div>
                
                { isEnterprise && (
                    <div className="form-group">
                        <label htmlFor="role">{ 'Role' }</label>
                        <Select
                            placeholder="Selct Role"
                            selection
                            options={ roles }
                            name="roleId"
                            defaultValue={ user.roleId }
                            onChange={({ value }) => user.updateKey('roleId', value)}
                            className="block"
                            isDisabled={user.isSuperAdmin}
                        />
                    </div>
                )}
                </form>

                <div className="flex items-center">
                    <div className="flex items-center mr-auto">
                        <Button
                            onClick={ onSave }
                            disabled={ !user.valid(isEnterprise) || isSaving }
                            loading={ isSaving }
                            primary
                            marginRight
                        >
                            { user.exists() ? 'Update' : 'Invite' }
                        </Button>
                        <Button
                            data-hidden={ !user.exists() }
                            onClick={ hideModal }
                            outline
                        >
                            { 'Cancel' }
                        </Button>
                    </div>
                    <div>
                        <Button
                            data-hidden={ !user.exists() }
                            onClick={ deleteHandler }
                        >
                            <Icon name="trash" size="16" />
                        </Button>
                    </div>
                </div>

                { !user.isJoined && user.invitationLink &&
                    <CopyButton
                        content={user.invitationLink}
                        className="link mt-4"
                        btnText="Copy invite link"
                    />
                }
        </div>
    ));
}

export default connect(state => ({
    isEnterprise: state.getIn([ 'user', 'client', 'edition' ]) === 'ee',
}))(UserForm);