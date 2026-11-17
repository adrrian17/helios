# Helios Glossary

Helios is a work tracker for a single small team, mixing Linear's structured issues with Trello's board feel.

## Workspace

The one organization an installation of Helios serves. Every Member, Project and Issue belongs to it. There is exactly one Workspace per installation.

_Spanish UI_: Espacio de trabajo

## Member

A person who can sign in to the Workspace and be assigned Issues. Every Member has a role: Admin or Member.

_Spanish UI_: Miembro

## Admin

A Member who can also manage the Workspace: invite and deactivate Members, create and archive Projects, and edit Workflow States. The first Admin is seeded when Helios is installed.

_Spanish UI_: Administrador

## Invitation

An Admin's grant that lets a given email address sign in and become a Member.

_Spanish UI_: Invitación

## Project

A container of Issues shown as a board. Each Project owns its own Workflow States and gives its Issues their Identifier prefix. A Project is archived, never deleted.

_Avoid_: Board, Team.

_Spanish UI_: Proyecto

## Issue

The unit of work. Belongs to exactly one Project, sits in exactly one Workflow State, and carries an Identifier, a title, a description, a Priority, an optional assignee, Labels, a Checklist, Comments and Activity.

_Avoid_: Card, Task, Ticket.

_Spanish UI_: Tarea

## Identifier

The human-readable handle of an Issue, made of its Project's prefix and a number, such as `HEL-42`.

_Spanish UI_: Identificador

## Workflow State

A column on a Project's board. Every Issue sits in exactly one. Each Workflow State belongs to one State Category.

_Avoid_: List, Column, Status.

_Spanish UI_: Estado

## State Category

The fixed meaning behind a Workflow State: `ideas`, `backlog`, `started`, `completed` or `cancelled`. Categories answer "is this done?" regardless of what a Project names its states.

- `ideas`: not committed to; may never be done.
- `backlog`: accepted, not yet started.
- `started`: being worked on.
- `completed`: done.
- `cancelled`: will not be done.

_Spanish UI_: Categoría de estado (`ideas` = Ideas, `backlog` = Pendiente, `started` = En curso, `completed` = Completada, `cancelled` = Cancelada)

## Priority

How urgent an Issue is: No priority, Urgent, High, Medium or Low.

_Spanish UI_: Prioridad (No priority = Sin prioridad, Urgent = Urgente, High = Alta, Medium = Media, Low = Baja)

## Label

A coloured tag shared across the whole Workspace and attached to Issues in any Project.

_Spanish UI_: Etiqueta

## Checklist

An ordered list of items on an Issue, each either checked or unchecked.

_Spanish UI_: Checklist

## Comment

A message a Member leaves on an Issue.

_Spanish UI_: Comentario

## Activity

The history of changes to an Issue: who changed what, and when.

_Spanish UI_: Actividad

## My Issues

The view of every Issue assigned to the signed-in Member, across all Projects, limited to Issues in the `backlog` and `started` State Categories.

_Spanish UI_: Mis tareas
