using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MyProject.API.Services;

namespace MyProject.API.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, Context.User!.UserId().ToString());
        await base.OnConnectedAsync();
    }
}
